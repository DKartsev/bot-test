const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ipaddr = require('ipaddr.js');
const rateLimit = require('express-rate-limit');

function ensureLogsDir() {
  fs.mkdirSync(path.join(__dirname, '..', '..', 'logs'), { recursive: true });
}

function parseBearerToken(req) {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.*)$/i);
  return match ? match[1].trim() : null;
}

function splitEnv(name) {
  return (process.env[name] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getRoleForToken(token) {
  if (!token) return null;
  const adminTokens = splitEnv('ADMIN_TOKENS');
  const editorTokens = splitEnv('EDITOR_TOKENS');
  if (adminTokens.includes(token)) return 'admin';
  if (editorTokens.includes(token)) return 'editor';
  return null;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
}

let cachedAllowlist;
function getAllowlist() {
  if (cachedAllowlist) return cachedAllowlist;
  const envList = splitEnv('ADMIN_IP_ALLOWLIST');
  const entries = envList.length ? envList : ['127.0.0.1', '::1'];
  cachedAllowlist = entries.map((e) => {
    if (e.includes('/')) {
      const [ip, range] = ipaddr.parseCIDR(e);
      return { type: 'cidr', ip, range: parseInt(range, 10) };
    }
    return { type: 'ip', ip: ipaddr.parse(e) };
  });
  return cachedAllowlist;
}

function ipAllowed(req) {
  try {
    let addr = ipaddr.parse(req.ip);
    if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
      addr = addr.toIPv4Address();
    }
    const allowlist = getAllowlist();
    return allowlist.some((entry) => {
      if (entry.type === 'ip') {
        return addr.toString() === entry.ip.toString();
      }
      return addr.match([entry.ip, entry.range]);
    });
  } catch (e) {
    return false;
  }
}

function auditLog(req, record) {
  ensureLogsDir();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    path: req.originalUrl || req.path,
    role: req.auth?.role,
    tokenHash: req.auth?.tokenHash,
    ...record
  });
  fs.appendFileSync(path.join(__dirname, '..', '..', 'logs', 'audit.jsonl'), line + '\n');
}

function authMiddleware(requiredRoles = []) {
  return (req, res, next) => {
    const token = parseBearerToken(req);
    const role = getRoleForToken(token);
    if (!token || !role || (requiredRoles.length && !requiredRoles.includes(role))) {
      auditLog(req, { action: 'auth', ok: false });
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.auth = { role, tokenHash: hashToken(token) };
    next();
  };
}

function ipAllowlistMiddleware() {
  return (req, res, next) => {
    if (!ipAllowed(req)) {
      auditLog(req, { action: 'ip.allow', ok: false });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function rateLimiter() {
  const windowMs = parseInt(process.env.ADMIN_RATE_WINDOW_MS || '60000', 10);
  const max = parseInt(process.env.ADMIN_RATE_MAX || '60', 10);
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      auditLog(req, { action: 'rate.limit', ok: false });
      res.status(429).json({ error: 'Too Many Requests' });
    }
  });
}

module.exports = {
  parseBearerToken,
  getRoleForToken,
  hashToken,
  ipAllowed,
  authMiddleware,
  ipAllowlistMiddleware,
  rateLimiter,
  auditLog
};

