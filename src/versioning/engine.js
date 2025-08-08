const fs = require('fs');
const path = require('path');
const { diffDatasets } = require('./diff');

const dataDir = path.join(__dirname, '..', '..', 'data');
const versionsDir = path.join(dataDir, 'versions');
const logsDir = path.join(__dirname, '..', '..', 'logs');
const logFile = path.join(logsDir, 'versioning.jsonl');

fs.mkdirSync(versionsDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

function logEvent(record) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record });
  fs.appendFileSync(logFile, line + '\n');
}

let store = null;
let lastVersionNumber = 0;
let debounceTimer = null;
let pendingReason = null;

const maxSnapshots = parseInt(process.env.VERSIONS_MAX || '50', 10);
const ttlDays = parseInt(process.env.VERSIONS_TTL_DAYS || '30', 10);
const debounceMs = parseInt(process.env.VERSIONS_DEBOUNCE_MS || '500', 10);
const defaultIncludePending = process.env.VERSIONS_INCLUDE_PENDING === '1';
let autoReasonOnMutation = process.env.VERSIONS_REASON_ON_MUTATION !== '0';

function computeCounts(arr) {
  const counts = { total: arr.length, approved: 0, pending: 0, rejected: 0 };
  arr.forEach((i) => {
    if (i.status === 'approved') counts.approved++;
    else if (i.status === 'pending') counts.pending++;
    else if (i.status === 'rejected') counts.rejected++;
  });
  return counts;
}

function loadLastVersionNumber() {
  const files = fs.readdirSync(versionsDir).filter((f) => f.endsWith('.json'));
  files.forEach((f) => {
    const m = f.match(/\.v(\d+)\.json$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > lastVersionNumber) lastVersionNumber = n;
    }
  });
}

function resolveSnapshotFile(idOrFile) {
  const direct = path.join(versionsDir, idOrFile);
  if (fs.existsSync(direct)) return direct;
  if (/^v\d{3}$/i.test(idOrFile)) {
    const file = fs
      .readdirSync(versionsDir)
      .find((f) => f.endsWith(`${idOrFile}.json`));
    if (file) return path.join(versionsDir, file);
  }
  throw new Error('Snapshot not found');
}

function createSnapshot(reason, { includePending } = {}) {
  try {
    if (!store) throw new Error('store not initialized');
    const incPending =
      typeof includePending === 'boolean' ? includePending : defaultIncludePending;
    const data = incPending ? store.getAll() : store.getApproved();
    const counts = computeCounts(data);
    const ts = new Date().toISOString();
    lastVersionNumber += 1;
    const id = `v${String(lastVersionNumber).padStart(3, '0')}`;
    const fileTs = ts.replace(/:/g, '-').replace(/\..*/, '');
    const fileName = `qa_pairs.${fileTs}Z.${id}.json`;
    const snapshot = {
      id,
      ts,
      reason: reason || null,
      counts,
      includePending: incPending,
      data: data.map((i) => ({ ...i }))
    };
    const tmp = path.join(versionsDir, `${fileName}.tmp`);
    fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
    fs.renameSync(tmp, path.join(versionsDir, fileName));
    logEvent({ event: 'snapshot', id, reason, counts, ok: true });
    gcOldSnapshots();
    const { data: _, ...meta } = snapshot;
    return { file: fileName, ...meta };
  } catch (err) {
    logEvent({ event: 'snapshot', reason, ok: false, error: err.message });
    throw err;
  }
}

function listSnapshots() {
  const files = fs.readdirSync(versionsDir).filter((f) => f.endsWith('.json'));
  const list = [];
  files.forEach((f) => {
    try {
      const content = JSON.parse(
        fs.readFileSync(path.join(versionsDir, f), 'utf8')
      );
      const { data, ...meta } = content;
      list.push({ file: f, ...meta });
    } catch (e) {
      /* ignore */
    }
  });
  list.sort((a, b) => b.ts.localeCompare(a.ts));
  return list;
}

function getSnapshot(idOrFile) {
  const file = resolveSnapshotFile(idOrFile);
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { file: path.basename(file), ...content };
}

function diffWithCurrent(idOrFile) {
  if (!store) throw new Error('store not initialized');
  const snap = getSnapshot(idOrFile);
  const current = snap.includePending ? store.getAll() : store.getApproved();
  const diff = diffDatasets(snap.data, current);
  return {
    id: snap.id,
    ts: snap.ts,
    includePending: snap.includePending,
    diff,
    counts: { snapshot: snap.counts, current: computeCounts(current) }
  };
}

function rollbackTo(idOrFile, { preservePending = true } = {}) {
  if (!store) throw new Error('store not initialized');
  try {
    const snap = getSnapshot(idOrFile);
    const current = store.getAll();
    let newData = snap.data.map((i) => ({ ...i }));
    if (preservePending) {
      const extras = current.filter((i) => i.status !== 'approved');
      const map = new Map(newData.map((i) => [i.id, i]));
      extras.forEach((i) => {
        if (!map.has(i.id)) map.set(i.id, i);
      });
      newData = Array.from(map.values());
    }
    store.replaceAll(newData);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const newSnap = createSnapshot(`rollback:${snap.id}`);
    logEvent({ event: 'rollback', from: snap.id, ok: true, newVersionId: newSnap.id });
    return { ok: true, newVersionId: newSnap.id };
  } catch (err) {
    logEvent({ event: 'rollback', from: idOrFile, ok: false, error: err.message });
    throw err;
  }
}

function gcOldSnapshots() {
  try {
    const list = listSnapshots();
    const now = Date.now();
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    const toDelete = [];
    list.forEach((s, idx) => {
      if (idx === 0) return; // keep newest
      const age = now - new Date(s.ts).getTime();
      if (age > ttlMs) toDelete.push(s.file);
    });
    let remaining = list.filter((s) => !toDelete.includes(s.file));
    if (remaining.length > maxSnapshots) {
      const excess = remaining
        .slice(maxSnapshots)
        .map((s) => s.file);
      toDelete.push(...excess);
    }
    const deletedFiles = [];
    toDelete.forEach((f) => {
      try {
        fs.unlinkSync(path.join(versionsDir, f));
        deletedFiles.push(f);
      } catch (e) {
        /* ignore */
      }
    });
    if (deletedFiles.length) {
      logEvent({ event: 'gc', deletedFiles, ok: true });
    }
  } catch (err) {
    logEvent({ event: 'gc', ok: false, error: err.message });
  }
}

function initVersioning(s) {
  store = s;
  loadLastVersionNumber();
  store.onUpdated((ctx) => {
    if (autoReasonOnMutation && ctx && ctx.op) {
      pendingReason = `mutation:${ctx.op}`;
    } else {
      pendingReason = 'mutation';
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      createSnapshot(pendingReason);
      pendingReason = null;
    }, debounceMs);
  });
}

function setAutoReasonOnMutation(flag) {
  autoReasonOnMutation = !!flag;
}

module.exports = {
  initVersioning,
  createSnapshot,
  listSnapshots,
  getSnapshot,
  diffWithCurrent,
  rollbackTo,
  gcOldSnapshots,
  setAutoReasonOnMutation,
  logEvent
};
