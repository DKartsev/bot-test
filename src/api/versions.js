const express = require('express');
const {
  listSnapshots,
  getSnapshot,
  diffWithCurrent,
  createSnapshot,
  rollbackTo,
  logEvent
} = require('../versioning/engine');
const { authMiddleware, auditLog } = require('../utils/security');

const router = express.Router();

router.get('/', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const snapshots = listSnapshots();
    auditLog(req, { action: 'versions.list', ok: true, details: { count: snapshots.length } });
    logEvent({ event: 'api', action: 'versions.list', ok: true });
    res.json({ ok: true, snapshots });
  } catch (err) {
    auditLog(req, { action: 'versions.list', ok: false, details: { error: err.message } });
    logEvent({ event: 'api', action: 'versions.list', ok: false, error: err.message });
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const snap = getSnapshot(req.params.id);
    const { data, ...meta } = snap;
    const full = req.query.full === '1';
    auditLog(req, { action: 'versions.get', ok: true, details: { id: req.params.id, full } });
    logEvent({ event: 'api', action: 'versions.get', id: req.params.id, ok: true });
    res.json({ ok: true, snapshot: full ? snap : meta });
  } catch (err) {
    auditLog(req, { action: 'versions.get', ok: false, details: { id: req.params.id, error: err.message } });
    logEvent({ event: 'api', action: 'versions.get', id: req.params.id, ok: false, error: err.message });
    res.status(404).json({ ok: false, error: 'Not found' });
  }
});

router.get('/:id/diff', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const diff = diffWithCurrent(req.params.id);
    auditLog(req, { action: 'versions.diff', ok: true, details: { id: req.params.id } });
    logEvent({ event: 'api', action: 'versions.diff', id: req.params.id, ok: true });
    res.json({ ok: true, diff });
  } catch (err) {
    auditLog(req, { action: 'versions.diff', ok: false, details: { id: req.params.id, error: err.message } });
    logEvent({ event: 'api', action: 'versions.diff', id: req.params.id, ok: false, error: err.message });
    res.status(404).json({ ok: false, error: 'Not found' });
  }
});

router.post('/snapshot', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const reason = req.body?.reason || 'manual';
    const includePending = req.body?.includePending;
    const snap = createSnapshot(reason, { includePending });
    auditLog(req, { action: 'versions.snapshot', ok: true, details: { id: snap.id, reason } });
    logEvent({ event: 'api', action: 'versions.snapshot', id: snap.id, reason, ok: true });
    res.json({ ok: true, snapshot: snap });
  } catch (err) {
    auditLog(req, { action: 'versions.snapshot', ok: false, details: { error: err.message } });
    logEvent({ event: 'api', action: 'versions.snapshot', ok: false, error: err.message });
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/:id/rollback', authMiddleware(['admin']), (req, res) => {
  try {
    const preservePending = req.body?.preservePending !== false;
    const result = rollbackTo(req.params.id, { preservePending });
    auditLog(req, { action: 'versions.rollback', ok: true, details: { id: req.params.id, preservePending } });
    logEvent({ event: 'api', action: 'versions.rollback', from: req.params.id, ok: true, newVersionId: result.newVersionId });
    res.json(result);
  } catch (err) {
    auditLog(req, { action: 'versions.rollback', ok: false, details: { id: req.params.id, error: err.message } });
    logEvent({ event: 'api', action: 'versions.rollback', from: req.params.id, ok: false, error: err.message });
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = router;
