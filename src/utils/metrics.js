const fs = require('fs');
const path = require('path');
const store = require('../data/store');

const counters = {
  totalRequests: 0,
  localHits: 0,
  openaiHits: 0,
  noMatch: 0,
  openaiCached: 0,
  feedbackTotal: 0,
  feedbackPositive: 0,
  feedbackNegative: 0,
  feedbackNeutral: 0,
  semanticQueriesTotal: 0,
  semanticAccepted: 0,
  semanticRejected: 0,
  ragQueriesTotal: 0,
  ragUsed: 0,
  ragChunksReturned: 0,
  dlpDetectionsIn: { pii: 0, secrets: 0, profanity: 0 },
  dlpDetectionsOut: { pii: 0, secrets: 0, profanity: 0 },
  dlpBlockedIn: 0,
  dlpBlockedOut: 0
};

const timings = {
  totalDurationMs: 0,
  maxDurationMs: 0,
  count: 0
};

const langCounters = {};
const feedbackLangCounters = {};

let promHooks = {};

const requestEvents = [];
const errorEvents = [];
const openaiEvents = [];
const tenantCounters = {};

function setPromHooks(hooks = {}) {
  promHooks = hooks;
}

function recordRequest(durationMs, source, lang, tenant) {
  counters.totalRequests += 1;
  timings.totalDurationMs += durationMs;
  timings.count += 1;
  if (durationMs > timings.maxDurationMs) {
    timings.maxDurationMs = durationMs;
  }
  if (source === 'local') {
    counters.localHits += 1;
  } else if (source === 'openai') {
    counters.openaiHits += 1;
    openaiEvents.push(Date.now());
    if (promHooks.incOpenAI) promHooks.incOpenAI();
  } else if (source === 'none') {
    counters.noMatch += 1;
  }
  const key = lang || 'unknown';
  langCounters[key] = (langCounters[key] || 0) + 1;
  requestEvents.push(Date.now());
  if (promHooks.incRequests) promHooks.incRequests({ source, lang: key });
  if (tenant && tenant.orgId) {
    const tkey = `${tenant.orgId}:${tenant.projectId}`;
    tenantCounters[tkey] = (tenantCounters[tkey] || 0) + 1;
  }
}

function recordSemantic({ accepted }) {
  counters.semanticQueriesTotal += 1;
  if (accepted) counters.semanticAccepted += 1;
  else counters.semanticRejected += 1;
  if (promHooks.incSemantic) promHooks.incSemantic({ accepted });
}

function recordNoMatch(question) {
  counters.noMatch += 1;
  const dir = path.join(__dirname, '..', '..', 'logs');
  fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), question }) + '\n';
  fs.appendFileSync(path.join(dir, 'no_match.jsonl'), line);
}

function recordOpenaiCached() {
  counters.openaiCached += 1;
}

function recordError(route) {
  errorEvents.push(Date.now());
  if (promHooks.incErrors) promHooks.incErrors({ route });
}

function recordOpenAI() {
  counters.openaiHits += 1;
  openaiEvents.push(Date.now());
  if (promHooks.incOpenAI) promHooks.incOpenAI();
}

function recordRag({ used, chunks }) {
  counters.ragQueriesTotal += 1;
  if (used) counters.ragUsed += 1;
  if (chunks) counters.ragChunksReturned += chunks;
}

function recordDlp({ direction, type, blocked }) {
  if (direction === 'in') {
    counters.dlpDetectionsIn[type] = (counters.dlpDetectionsIn[type] || 0) + 1;
    if (blocked) counters.dlpBlockedIn += 1;
  } else {
    counters.dlpDetectionsOut[type] = (counters.dlpDetectionsOut[type] || 0) + 1;
    if (blocked) counters.dlpBlockedOut += 1;
  }
}

function recordFeedback({ positive, negative, neutral, lang, source }) {
  counters.feedbackTotal += 1;
  if (positive) counters.feedbackPositive += 1;
  else if (negative) counters.feedbackNegative += 1;
  else counters.feedbackNeutral += 1;
  const key = lang || 'unknown';
  const entry = feedbackLangCounters[key] || {
    total: 0,
    positive: 0,
    negative: 0,
    neutral: 0
  };
  entry.total += 1;
  if (positive) entry.positive += 1;
  else if (negative) entry.negative += 1;
  else entry.neutral += 1;
  feedbackLangCounters[key] = entry;
}

function snapshot() {
  const avgDurationMs = timings.count ? timings.totalDurationMs / timings.count : 0;
  const pendingTotal = store
    .getAll()
    .filter((i) => i.status === 'pending').length;
  return {
    totalRequests: counters.totalRequests,
    localHits: counters.localHits,
    openaiHits: counters.openaiHits,
    noMatch: counters.noMatch,
    openaiCached: counters.openaiCached,
    feedbackTotal: counters.feedbackTotal,
    feedbackPositive: counters.feedbackPositive,
    feedbackNegative: counters.feedbackNegative,
    feedbackNeutral: counters.feedbackNeutral,
    semanticQueriesTotal: counters.semanticQueriesTotal,
    semanticAccepted: counters.semanticAccepted,
    semanticRejected: counters.semanticRejected,
    ragQueriesTotal: counters.ragQueriesTotal,
    ragUsed: counters.ragUsed,
    ragChunksReturned: counters.ragChunksReturned,
    dlpDetectionsIn: counters.dlpDetectionsIn,
    dlpDetectionsOut: counters.dlpDetectionsOut,
    dlpBlockedIn: counters.dlpBlockedIn,
    dlpBlockedOut: counters.dlpBlockedOut,
    pendingTotal,
    avgDurationMs,
    maxDurationMs: timings.maxDurationMs,
    langCounters,
    feedbackLangCounters,
    tenantCounters
  };
}

function prune(arr, cutoff) {
  while (arr.length && arr[0] < cutoff) arr.shift();
  return arr.length;
}

function getMovingWindowStats(windowSec) {
  const cutoff = Date.now() - windowSec * 1000;
  const total = prune(requestEvents, cutoff);
  const errors = prune(errorEvents, cutoff);
  const openai = prune(openaiEvents, cutoff);
  const errorRate = total ? errors / total : 0;
  const openaiRate = total ? openai / total : 0;
  return { total, errors, openai, errorRate, openaiRate };
}

module.exports = {
  setPromHooks,
  recordRequest,
  recordNoMatch,
  recordOpenaiCached,
  recordFeedback,
  recordError,
  recordOpenAI,
  recordSemantic,
  recordRag,
   recordDlp,
  getMovingWindowStats,
  snapshot
};
