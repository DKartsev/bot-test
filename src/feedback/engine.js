const fs = require('fs');
const path = require('path');
const readline = require('readline');
let store;
const { logger } = require('../utils/logger');

function getStore() {
  if (!store) {
    const { createStore } = require('../data/store');
    store = createStore();
  }
  return store;
}

const logPath = process.env.FEEDBACK_LOG_PATH ||
  path.join(__dirname, '..', '..', 'logs', 'feedback.jsonl');
const metricsPath = process.env.FEEDBACK_METRICS_PATH ||
  path.join(__dirname, '..', '..', 'feedback', 'metrics.json');

function wilsonLowerBound(pos, total, z = 1.96) {
  if (!total) return 0;
  const phat = pos / total;
  const denom = 1 + (z * z) / total;
  const numer =
    phat + (z * z) / (2 * total) -
    z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total);
  return numer / denom;
}

async function classifySentiment(text = '') {
  const content = String(text || '').toLowerCase();
  if (!content.trim()) {
    return { positive: false, negative: false, neutral: true };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: process.env.SENTIMENT_OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Classify the sentiment of the following text as positive, negative or neutral. Reply with one word.'
          },
          { role: 'user', content }
        ],
        max_tokens: 1,
        temperature: 0
      });
      const resp = completion.choices[0]?.message?.content?.toLowerCase() || '';
      return {
        positive: resp.includes('positive'),
        negative: resp.includes('negative'),
        neutral: resp.includes('neutral') || (!resp.includes('positive') && !resp.includes('negative'))
      };
    } catch (err) {
      logger.warn({ err }, 'OpenAI sentiment classification failed');
    }
  }
  const positives = ['good', 'great', 'excellent', 'love', 'awesome', 'fantastic', 'amazing', 'like'];
  const negatives = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'poor', 'dislike', 'worst'];
  let score = 0;
  for (const w of positives) if (content.includes(w)) score += 1;
  for (const w of negatives) if (content.includes(w)) score -= 1;
  if (score > 0) return { positive: true, negative: false, neutral: false };
  if (score < 0) return { positive: false, negative: true, neutral: false };
  return { positive: false, negative: false, neutral: true };
}

async function ingestLine(obj) {
  const sentiment = await classifySentiment(obj.comment || obj.text || '');
  obj.positive = sentiment.positive;
  obj.negative = sentiment.negative;
  obj.neutral = sentiment.neutral;
  await fs.promises.mkdir(path.dirname(logPath), { recursive: true });
  await fs.promises.appendFile(logPath, JSON.stringify(obj) + '\n');
  return obj;
}

async function recomputeAll() {
  const items = {};
  const totals = { total: 0, pos: 0, neg: 0, neu: 0 };
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
        totals.total += 1;
        if (obj.positive) {
          rec.pos += 1;
          totals.pos += 1;
        }
        if (obj.negative) {
          rec.neg += 1;
          totals.neg += 1;
        }
        if (obj.neutral) {
          rec.neu += 1;
          totals.neu += 1;
        }
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
  const snapshot = { items, totals, updatedAt: new Date().toISOString() };
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
  const all = getStore().getAll();
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
  classifySentiment,
  ingestLine,
  recomputeAll,
  getSnapshot,
  suggestActions,
  applyAutoActions,
  startFeedbackAggregator
};
