const rateLimit = require('express-rate-limit');
const orgStore = require('./orgStore');
const fs = require('fs');
const path = require('path');

const {
  TENANT_RATE_WINDOW_MS = 60000,
  TENANT_RATE_MAX = 120
} = process.env;

const usageFile = path.join(__dirname, '../../data/usage.json');
let usageCounters = {};
let currentMonth = new Date().getUTCMonth();

function loadUsage() {
  try {
    const data = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
    if (data && typeof data === 'object') {
      if (typeof data.month === 'number') currentMonth = data.month;
      if (data.usageCounters && typeof data.usageCounters === 'object') {
        usageCounters = data.usageCounters;
      }
    }
  } catch (_) {
    // ignore missing or invalid file
  }
}

function saveUsage() {
  try {
    fs.mkdirSync(path.dirname(usageFile), { recursive: true });
    fs.writeFileSync(
      usageFile,
      JSON.stringify({ month: currentMonth, usageCounters })
    );
  } catch (_) {
    // ignore write errors
  }
}

loadUsage();
resetMonthlyIfNeeded();

function key(req) {
  return req.tenant ? `${req.tenant.orgId}:${req.tenant.projectId}` : 'unknown';
}

function resetMonthlyIfNeeded() {
  const now = new Date().getUTCMonth();
  if (now !== currentMonth) {
    currentMonth = now;
    usageCounters = {};
    saveUsage();
  }
}

function tenantRateLimiter() {
  return rateLimit({
    windowMs: Number(TENANT_RATE_WINDOW_MS),
    max: Number(TENANT_RATE_MAX),
    keyGenerator: (req) => key(req),
    standardHeaders: true,
    legacyHeaders: false
  });
}

function checkQuotas({ type, cost }, req) {
  resetMonthlyIfNeeded();
  const k = key(req);
  usageCounters[k] = usageCounters[k] || { requests: 0, openaiTokens: 0, ragMB: 0 };
  const org = orgStore.getOrg(req.tenant.orgId);
  if (!org) return { ok: false, reason: 'org_not_found' };
  const usage = usageCounters[k];
  if (type === 'request') usage.requests += cost;
  if (type === 'openaiTokens') usage.openaiTokens += cost;
  if (type === 'ragStorageMB') usage.ragMB += cost;
  saveUsage();
  if (usage.requests > org.quotas.requestsMonth) return { ok: false, reason: 'quota_requests' };
  if (usage.openaiTokens > org.quotas.openaiTokensMonth) return { ok: false, reason: 'quota_tokens' };
  if (usage.ragMB > org.quotas.ragMB) return { ok: false, reason: 'quota_rag' };
  return { ok: true };
}

module.exports = { tenantRateLimiter, checkQuotas, resetMonthlyIfNeeded };
