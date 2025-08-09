const express = require('express');
const fs = require('fs');
const path = require('path');
const dlp = require('../security/dlp');
const { ipAllowlistMiddleware, rateLimiter, authMiddleware, auditLog } = require('../utils/security');

const router = express.Router();
router.use(ipAllowlistMiddleware());
router.use(rateLimiter());
router.use(authMiddleware(['admin']));

router.get('/policy', (req, res) => {
  auditLog(req, { action: 'dlp.policy' });
  const file = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'security', 'policies.yaml'), 'utf8');
  res.json({ yaml: file, meta: dlp.getPolicyMeta() });
});

router.post('/policy/reload', (req, res) => {
  const meta = dlp.loadPolicies();
  auditLog(req, { action: 'dlp.reload' });
  res.json({ ok: true, meta });
});

router.get('/detections', (req, res) => {
  auditLog(req, { action: 'dlp.detections' });
  const n = parseInt(req.query.n || '200', 10);
  const file = path.join(__dirname, '..', '..', 'logs', 'dlp.jsonl');
  try {
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    const slice = lines.slice(-n);
    res.type('application/json').send(slice.join('\n'));
  } catch (e) {
    res.type('application/json').send('');
  }
});

router.post('/test', express.json({ limit: '1mb' }), (req, res) => {
  auditLog(req, { action: 'dlp.test' });
  const { text = '', direction = 'in' } = req.body || {};
  if (direction === 'out') {
    const out = dlp.sanitizeOut({ text, route: '/admin/security/test', direction: 'out' });
    res.json(out);
  } else {
    const result = dlp.scanIn({ text, route: '/admin/security/test' });
    res.json(result);
  }
});

module.exports = router;
