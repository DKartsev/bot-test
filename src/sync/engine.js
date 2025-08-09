const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const deepEqual = require('fast-deep-equal');
const { createStore } = require('../data/store');
const store = createStore();
const { logger } = require('../utils/logger');
const { toLocalItem, toProviderRow } = require('./map');

const status = {
  lastRunAt: null,
  lastOk: null,
  lastSummary: null,
  lastError: null,
  lastDiff: { toAdd: [], toUpdate: [], toDelete: [] }
};

function selectProvider() {
  const provider = (process.env.SYNC_PROVIDER || 'google').toLowerCase();
  if (provider === 'airtable') return require('./provider/airtable');
  return require('./provider/googleSheets');
}

function fieldsEqual(a, b) {
  return (
    a.Question === b.Question &&
    a.Answer === b.Answer &&
    a.status === b.status &&
    a.source === b.source &&
    deepEqual(a.meta || {}, b.meta || {})
  );
}

function computeDiff(remoteItems, localItems) {
  const localMap = new Map(localItems.map((i) => [i.id, i]));
  const diff = { toAdd: [], toUpdate: [], toDelete: [] };
  for (const r of remoteItems) {
    if (r.status !== 'approved') continue;
    const l = localMap.get(r.id);
    if (!l) {
      diff.toAdd.push(r);
    } else if (
      !fieldsEqual(r, l) &&
      new Date(r.updatedAt).getTime() > new Date(l.updatedAt).getTime()
    ) {
      diff.toUpdate.push(r);
    }
  }
  if (process.env.SYNC_ALLOW_DELETES === '1') {
    const remoteIds = new Set(
      remoteItems.filter((r) => r.status === 'approved').map((r) => r.id)
    );
    for (const l of localItems) {
      if (l.status === 'approved' && !remoteIds.has(l.id)) {
        diff.toDelete.push(l.id);
      }
    }
  }
  return diff;
}

function applyLocal(diff) {
  if (!diff.toAdd.length && !diff.toUpdate.length && !diff.toDelete.length) return;
  const map = new Map(store.getAll().map((i) => [i.id, { ...i }]));
  diff.toAdd.forEach((item) => {
    map.set(item.id, item);
  });
  diff.toUpdate.forEach((item) => {
    const existing = map.get(item.id);
    if (existing) {
      map.set(item.id, { ...existing, ...item });
    }
  });
  diff.toDelete.forEach((id) => {
    map.delete(id);
  });
  store.replaceAll(Array.from(map.values()));
}

function computeOutbound(localItems, remoteItems) {
  const remoteMap = new Map(
    remoteItems.filter((r) => r.status === 'approved').map((r) => [r.id, r])
  );
  const upserts = [];
  const deletes = [];
  localItems.forEach((item) => {
    if (item.status !== 'approved') return;
    const remote = remoteMap.get(item.id);
    if (!remote) {
      upserts.push(item);
    } else if (
      new Date(item.updatedAt).getTime() > new Date(remote.updatedAt || 0).getTime() &&
      !fieldsEqual(item, remote)
    ) {
      upserts.push(item);
    }
  });
  if (process.env.SYNC_ALLOW_DELETES === '1') {
    const localIds = new Set(
      localItems.filter((i) => i.status === 'approved').map((i) => i.id)
    );
    remoteItems.forEach((r) => {
      if (r.status !== 'approved') return;
      if (!localIds.has(r.id)) deletes.push(r.id);
    });
  }
  return { upserts, deletes };
}

async function runSync() {
  const providerName = process.env.SYNC_PROVIDER || 'google';
  const provider = selectProvider();
  const start = Date.now();
  const logDir = path.join(__dirname, '..', '..', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'sync.jsonl');
  try {
    const remoteRows = await provider.fetchAll();
    const remoteItems = [];
    for (const row of remoteRows) {
      try {
        remoteItems.push(toLocalItem(row));
      } catch (e) {
        logger.warn({ err: e, row }, 'Invalid remote row');
      }
    }
    const localItems = store.getAll();
    const diff = computeDiff(remoteItems, localItems);
    status.lastDiff = {
      toAdd: diff.toAdd.map((i) => ({ ...i })),
      toUpdate: diff.toUpdate.map((i) => ({ ...i })),
      toDelete: [...diff.toDelete]
    };
    if (process.env.SYNC_LOG_PREVIEW === '1') {
      fs.appendFileSync(
        logPath,
        JSON.stringify({
          ts: new Date().toISOString(),
          provider: providerName,
          preview: {
            add: diff.toAdd.length,
            update: diff.toUpdate.length,
            delete: diff.toDelete.length
          }
        }) + '\n'
      );
    }
    applyLocal(diff);
    let outbound = { upserts: [], deletes: [] };
    if (process.env.SYNC_BIDIRECTIONAL === '1') {
      const localAfter = store.getAll();
      outbound = computeOutbound(localAfter, remoteItems);
      if (outbound.upserts.length || outbound.deletes.length) {
        await provider.pushChanges({
          upserts: outbound.upserts.map(toProviderRow),
          deletes: outbound.deletes
        });
      }
    }
    const summary = {
      fetched: remoteItems.length,
      upsertedLocal: diff.toAdd.length,
      updatedLocal: diff.toUpdate.length,
      deletedLocal: diff.toDelete.length,
      pushedUpserts: outbound.upserts.length,
      pushedDeletes: outbound.deletes.length
    };
    const ms = Date.now() - start;
    fs.appendFileSync(
      logPath,
      JSON.stringify({
        ts: new Date().toISOString(),
        provider: providerName,
        fetched: summary.fetched,
        applied: {
          add: diff.toAdd.length,
          update: diff.toUpdate.length,
          delete: diff.toDelete.length
        },
        outbound: {
          upserts: summary.pushedUpserts,
          deletes: summary.pushedDeletes
        },
        ok: true,
        ms
      }) + '\n'
    );
    status.lastRunAt = new Date().toISOString();
    status.lastOk = true;
    status.lastSummary = summary;
    status.lastError = null;
    return summary;
  } catch (err) {
    const ms = Date.now() - start;
    fs.appendFileSync(
      logPath,
      JSON.stringify({
        ts: new Date().toISOString(),
        provider: providerName,
        ok: false,
        error: err.message,
        ms
      }) + '\n'
    );
    status.lastRunAt = new Date().toISOString();
    status.lastOk = false;
    status.lastError = err.message;
    logger.error({ err }, 'Sync failed');
    throw err;
  }
}

function startScheduler() {
  const expr = process.env.SYNC_CRON;
  if (expr) {
    cron.schedule(expr, () => {
      runSync().catch((err) => logger.error({ err }, 'Scheduled sync failed'));
    });
  }
}

function getStatus() {
  return {
    lastRunAt: status.lastRunAt,
    lastOk: status.lastOk,
    lastSummary: status.lastSummary ? { ...status.lastSummary } : null,
    lastError: status.lastError
  };
}

function getLastDiff() {
  return {
    toAdd: status.lastDiff.toAdd.map((i) => ({ ...i })),
    toUpdate: status.lastDiff.toUpdate.map((i) => ({ ...i })),
    toDelete: [...status.lastDiff.toDelete]
  };
}

module.exports = { runSync, startScheduler, getStatus, getLastDiff };
