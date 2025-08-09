const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const crypto = require('crypto');
const { detectAll } = require('./patterns');
const { redact } = require('./redactor');
const metrics = require('../utils/metrics');

const POL_PATH = path.join(__dirname, '..', '..', 'data', 'security', 'policies.yaml');
const LOG_PATH = path.join(__dirname, '..', '..', 'logs', 'dlp.jsonl');

let policies = { version: 0 };
let watcher = null;
const stats = { in: { pii: 0, secrets: 0, profanity: 0, blocked: 0 }, out: { pii: 0, secrets: 0, profanity: 0, blocked: 0 }, ingest: { pii:0, secrets:0, profanity:0, blocked:0 } };

function hashIfNeeded(val) {
  if (process.env.DLP_HASH_SENSITIVE_IN_LOGS === '1') {
    return crypto.createHash('sha1').update(String(val)).digest('hex');
  }
  return val;
}

function logEvent({ direction, route, detections, blocked, text }) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    const types = { pii: 0, secrets: 0, profanity: 0 };
    const values = [];
    detections.forEach((d) => {
      types[d.type] += 1;
      values.push(hashIfNeeded(d.value));
    });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      direction,
      route,
      types,
      blocked,
      values,
      policyVersion: policies.version
    });
    const shouldLog = detections.length || Math.random() < Number(process.env.DLP_LOG_SAMPLE_RATE || '0');
    if (shouldLog) fs.appendFileSync(LOG_PATH, line + '\n');
  } catch (e) {
    // noop
  }
}

function loadPolicies() {
  try {
    const text = fs.readFileSync(POL_PATH, 'utf8');
    policies = yaml.parse(text) || { version: 0 };
  } catch (e) {
    policies = { version: 0 };
  }
  if (watcher) watcher.close();
  watcher = fs.watch(POL_PATH, { persistent: false }, debounce(loadPolicies, 200));
  return getPolicyMeta();
}

function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

function severityRank(s) {
  return ['low', 'medium', 'high', 'critical'].indexOf((s || 'low').toLowerCase());
}

function shouldBlockOut(d) {
  if (d.type === 'secrets') return process.env.DLP_BLOCK_SECRETS_OUT === '1' || d.rule?.block_out;
  if (d.type === 'pii') return process.env.DLP_BLOCK_PII_OUT === '1';
  return false;
}

function scanIn({ text = '', route = '/' }) {
  if (process.env.DLP_ENABLED === '0') return { blocked: false, detections: [] };
  const detections = detectAll(text, policies);
  const minRank = severityRank(process.env.DLP_MIN_SEVERITY || 'low');
  const blocked =
    process.env.DLP_MODE === 'enforce' &&
    detections.some((d) => severityRank(d.severity) >= minRank && d.rule?.block_in);
  detections.forEach((d) => {
    metrics.recordDlp({ direction: 'in', type: d.type, blocked });
    stats.in[d.type] += 1;
  });
  if (blocked) stats.in.blocked += 1;
  logEvent({ direction: 'in', route, detections, blocked, text });
  return { blocked, detections };
}

function sanitizeOut({ text = '', route = '/', direction = 'out' }) {
  if (process.env.DLP_ENABLED === '0') return { blocked: false, text, detections: [] };
  let detections = detectAll(text, policies);
  const style = process.env.DLP_REDACTION_STYLE || 'tag';
  const partial = process.env.DLP_PARTIAL_MASK !== '0';
  let blocked = false;
  detections.forEach((d) => {
    if (shouldBlockOut(d)) blocked = true;
  });
  let redacted = text;
  if (detections.length) {
    redacted = redact(text, detections, { style, partialMask: partial });
  }
  logEvent({ direction, route, detections, blocked, text });
  detections.forEach((d) => {
    metrics.recordDlp({ direction: direction === 'out' ? 'out' : direction, type: d.type, blocked });
    stats[direction][d.type] += 1;
  });
  if (blocked) stats[direction].blocked += 1;
  return { blocked, text: redacted, detections };
}

function getPolicyMeta() {
  const pii = Object.keys(policies.pii || {}).length;
  const secrets = Object.keys(policies.secrets || {}).length;
  const profanity = Object.keys(policies.profanity || {}).length;
  return { version: policies.version, counts: { pii, secrets, profanity } };
}

function getStats() {
  return stats;
}

module.exports = { loadPolicies, scanIn, sanitizeOut, getPolicyMeta, getStats };
