const fs = require('fs');
const path = require('path');
const store = require('../data/store');

const counters = {
  totalRequests: 0,
  localHits: 0,
  openaiHits: 0,
  noMatch: 0,
  openaiCached: 0
};

const timings = {
  totalDurationMs: 0,
  maxDurationMs: 0,
  count: 0
};

function recordRequest(durationMs, source) {
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
  } else if (source === 'none') {
    counters.noMatch += 1;
  }
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
    pendingTotal,
    avgDurationMs,
    maxDurationMs: timings.maxDurationMs
  };
}

module.exports = {
  recordRequest,
  recordNoMatch,
  recordOpenaiCached,
  snapshot
};
