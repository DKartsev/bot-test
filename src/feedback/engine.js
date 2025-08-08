const fs = require('fs');
const path = require('path');
const readline = require('readline');
const store = require('../data/store');
const { logger } = require('../utils/logger');

const logPath = path.join(__dirname, '..', '..', 'logs', 'feedback.jsonl');
const metricsPath = path.join(__dirname, '..', '..', 'feedback', 'metrics.json');

function wilsonLowerBound(pos, total, z = 1.96) {
  if (!total) return 0;
  const phat = pos / total;
  const denom = 1 + (z * z) / total;
  const numer =
    phat + (z * z) / (2 * total) -
    z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total);
  return numer / denom;
}

async function ingestLine(obj) {
  await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
  await fs.promises.appendFile(logPath, JSON.stringify(obj) + '\n');
}

async function recomputeAll() {
  const items = {};
  await fs.promises.mkdir(path.dirname(metricsPath), { recursive: true });
  if (fs.existsSync(logPath)) {
    const rl = readline.createInterface({
      input: fs.createReadStream(logPath),
      crlfDelay: Infinity
    });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const id = obj.itemId || obj.pendingId;
        if (!id) continue;
        const rec =
          items[id] || {
            total: 0,
            pos: 0,
            neg: 0,
            neu: 0,
            bySource: {},
            byLang: {},
            lastTs: null
          };
        rec.total += 1;
        if (obj.positive) rec.pos += 1;
        if (obj.negative) rec.neg += 1;
        if (obj.neutral) rec.neu += 1;
        if (obj.source) {
          rec.bySource[obj.source] = (rec.bySource[obj.source] || 0) + 1;
        }
        if (obj.lang) {
          rec.byLang[obj.lang] = (rec.byLang[obj.lang] || 0) + 1;
        }
        if (!rec.lastTs || obj.ts > rec.lastTs) rec.lastTs = obj.ts;
        items[id] = rec;
      } catch (err) {
        logger.warn({ err }, 'Failed to parse feedback line');
      }
    }
  }
  for (const rec of Object.values(items)) {
    rec.posRatio = rec.pos / Math.max(1, rec.total);
    rec.wilson = wilsonLowerBound(rec.pos, rec.total);
  }
  const snapshot = { items, updatedAt: new Date().toISOString() };
  const tmp = metricsPath + '.tmp';
  await fs.promises.writeFile(tmp, JSON.stringify(snapshot, null, 2));
  await fs.promises.rename(tmp, metricsPath);
  return snapshot;
}

function getSnapshot() {
  try {
    const data = fs.readFileSync(metricsPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { items: {}, updatedAt: null };
  }
}

function suggestActions() {
  const snapshot = getSnapshot();
  const approve = [];
  const flag = [];
  const promoteMin = parseInt(process.env.FEEDBACK_PROMOTE_MIN || '5', 10);
  const promoteRatio = parseFloat(process.env.FEEDBACK_PROMOTE_RATIO || '0.8');
  const flagMin = parseInt(process.env.FEEDBACK_FLAG_MIN || '5', 10);
  const flagRatio = parseFloat(process.env.FEEDBACK_FLAG_RATIO || '0.3');
  const all = store.getAll();
  for (const item of all) {
    const stats = snapshot.items[item.id];
    if (!stats) continue;
    if (item.status === 'pending') {
      if (stats.total >= promoteMin && stats.posRatio >= promoteRatio) {
        approve.push({ id: item.id, total: stats.total, posRatio: stats.posRatio, wilson: stats.wilson });
      }
    } else if (item.status === 'approved') {
      if (stats.total >= flagMin && stats.posRatio <= flagRatio) {
        flag.push({ id: item.id, total: stats.total, posRatio: stats.posRatio, wilson: stats.wilson });
      }
    }
  }
  return { approve, flag };
}

async function applyAutoActions(storeInstance) {
  if (process.env.FEEDBACK_ENABLE_AUTO !== '1') {
    return { approved: [], flagged: [] };
  }
  const suggestions = suggestActions();
  const approved = [];
  const flagged = [];
  const modLog = path.join(__dirname, '..', '..', 'logs', 'moderation.jsonl');
  await fs.promises.mkdir(path.dirname(modLog), { recursive: true });
  for (const s of suggestions.approve) {
    const item = storeInstance.getById(s.id);
    if (item && item.status === 'pending') {
      storeInstance.approve(s.id);
      approved.push(s.id);
      await fs.promises.appendFile(
        modLog,
        JSON.stringify({ ts: new Date().toISOString(), action: 'auto.approve', id: s.id }) + '\n'
      );
    }
  }
  for (const s of suggestions.flag) {
    const item = storeInstance.getById(s.id);
    if (item && item.status === 'approved') {
      const now = new Date().toISOString().slice(0, 10);
      const notes = item.meta && item.meta.notes ? item.meta.notes + '\n' : '';
      storeInstance.update(s.id, { meta: { notes: `${notes}[auto-flag ${now}]: low rating` } });
      flagged.push(s.id);
      await fs.promises.appendFile(
        modLog,
        JSON.stringify({ ts: new Date().toISOString(), action: 'auto.flag', id: s.id }) + '\n'
      );
    }
  }
  return { approved, flagged };
}

function startFeedbackAggregator(storeInstance) {
  const interval = parseInt(process.env.FEEDBACK_AGG_INTERVAL_MIN || '0', 10);
  if (interval > 0) {
    setInterval(async () => {
      try {
        await recomputeAll();
        await applyAutoActions(storeInstance);
      } catch (err) {
        logger.error({ err }, 'feedback aggregation failed');
      }
    }, interval * 60 * 1000);
  }
}

module.exports = {
  ingestLine,
  recomputeAll,
  getSnapshot,
  suggestActions,
  applyAutoActions,
  startFeedbackAggregator
};
