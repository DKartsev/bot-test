const express = require('express');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const store = require('../data/store');
const { authMiddleware, auditLog } = require('../utils/security');
const { runSync, getStatus, getLastDiff } = require('../sync/engine');

const router = express.Router();

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const entrySchema = {
  type: 'object',
  required: ['Question', 'Answer'],
  properties: {
    id: { type: 'string' },
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
};

const patchSchema = {
  type: 'object',
  properties: {
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 }
  },
  additionalProperties: false,
  minProperties: 1
};

const approveSchema = {
  type: 'object',
  properties: {
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 },
    meta: { type: 'object' }
  },
  additionalProperties: false
};

const rejectSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
};

const entryValidator = ajv.compile(entrySchema);
const patchValidator = ajv.compile(patchSchema);
const approveValidator = ajv.compile(approveSchema);
const rejectValidator = ajv.compile(rejectSchema);
const arrayValidator = ajv.compile({ type: 'array', items: entrySchema });

function logModeration(action, id, editor, changes) {
  const dir = path.join(__dirname, '..', '..', 'logs');
  fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    action,
    id,
    editor,
    changes
  });
  fs.appendFileSync(path.join(dir, 'moderation.jsonl'), line + '\n');
}

router.get('/qa/pending', authMiddleware(['admin', 'editor']), (req, res) => {
  const pending = store.getAll().filter((i) => i.status === 'pending');
  auditLog(req, { action: 'qa.pending.list', ok: true, details: { count: pending.length } });
  res.json(pending);
});

router.post('/qa/pending/:id/approve', authMiddleware(['admin', 'editor']), (req, res) => {
  if (!approveValidator(req.body || {})) {
    auditLog(req, { action: 'qa.pending.approve', ok: false, details: { id: req.params.id, error: 'validation' } });
    return res
      .status(400)
      .json({ error: 'Validation error', details: approveValidator.errors });
  }
  try {
    const item = store.approve(req.params.id, req.body || {});
    if (!item) {
      auditLog(req, { action: 'qa.pending.approve', ok: false, details: { id: req.params.id } });
      return res.status(404).json({ error: 'Not found' });
    }
    const editor = req.headers['x-editor'];
    logModeration('approve', req.params.id, editor, req.body);
    logger.info({ id: req.params.id, editor, changes: req.body }, 'QA approved');
    auditLog(req, { action: 'qa.pending.approve', ok: true, details: { id: req.params.id } });
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'Failed to approve QA');
    auditLog(req, { action: 'qa.pending.approve', ok: false, details: { id: req.params.id, error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/qa/pending/:id/reject', authMiddleware(['admin', 'editor']), (req, res) => {
  if (!rejectValidator(req.body || {})) {
    auditLog(req, { action: 'qa.pending.reject', ok: false, details: { id: req.params.id, error: 'validation' } });
    return res
      .status(400)
      .json({ error: 'Validation error', details: rejectValidator.errors });
  }
  try {
    const item = store.reject(req.params.id, req.body?.reason);
    if (!item) {
      auditLog(req, { action: 'qa.pending.reject', ok: false, details: { id: req.params.id } });
      return res.status(404).json({ error: 'Not found' });
    }
    const editor = req.headers['x-editor'];
    logModeration('reject', req.params.id, editor, req.body);
    logger.info({ id: req.params.id, editor, reason: req.body?.reason }, 'QA rejected');
    auditLog(req, { action: 'qa.pending.reject', ok: true, details: { id: req.params.id } });
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'Failed to reject QA');
    auditLog(req, { action: 'qa.pending.reject', ok: false, details: { id: req.params.id, error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/qa/:id', authMiddleware(['admin', 'editor']), (req, res) => {
  const item = store.getById(req.params.id);
  if (!item) {
    auditLog(req, { action: 'qa.get', ok: false, details: { id: req.params.id } });
    return res.status(404).json({ error: 'Not found' });
  }
  auditLog(req, { action: 'qa.get', ok: true, details: { id: req.params.id } });
  res.json(item);
});

router.get('/qa', authMiddleware(['admin', 'editor']), (req, res) => {
  const all = store.getAll();
  auditLog(req, { action: 'qa.list', ok: true, details: { count: all.length } });
  res.json(all);
});

router.post('/qa', authMiddleware(['admin']), (req, res) => {
  if (!entryValidator(req.body)) {
    auditLog(req, { action: 'qa.create', ok: false, details: { error: 'validation' } });
    return res
      .status(400)
      .json({ error: 'Validation error', details: entryValidator.errors });
  }
  try {
    const item = store.addApproved(req.body);
    logger.info({ id: item.id }, 'QA added');
    auditLog(req, { action: 'qa.create', ok: true, details: { id: item.id } });
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'Failed to add QA');
    auditLog(req, { action: 'qa.create', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/qa/:id', authMiddleware(['admin', 'editor']), (req, res) => {
  if (!patchValidator(req.body)) {
    auditLog(req, { action: 'qa.update', ok: false, details: { id: req.params.id, error: 'validation' } });
    return res
      .status(400)
      .json({ error: 'Validation error', details: patchValidator.errors });
  }
  try {
    const updated = store.update(req.params.id, req.body);
    if (!updated) {
      auditLog(req, { action: 'qa.update', ok: false, details: { id: req.params.id } });
      return res.status(404).json({ error: 'Not found' });
    }
    logger.info({ id: req.params.id }, 'QA updated');
    auditLog(req, { action: 'qa.update', ok: true, details: { id: req.params.id } });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, 'Failed to update QA');
    auditLog(req, { action: 'qa.update', ok: false, details: { id: req.params.id, error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/qa/:id', authMiddleware(['admin']), (req, res) => {
  try {
    const ok = store.remove(req.params.id);
    if (!ok) {
      auditLog(req, { action: 'qa.delete', ok: false, details: { id: req.params.id } });
      return res.status(404).json({ error: 'Not found' });
    }
    logger.info({ id: req.params.id }, 'QA removed');
    auditLog(req, { action: 'qa.delete', ok: true, details: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, 'Failed to delete QA');
    auditLog(req, { action: 'qa.delete', ok: false, details: { id: req.params.id, error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/qa/import', authMiddleware(['admin']), (req, res) => {
  if (!arrayValidator(req.body)) {
    auditLog(req, { action: 'qa.import', ok: false, details: { error: 'validation' } });
    return res
      .status(400)
      .json({ error: 'Validation error', details: arrayValidator.errors });
  }
  try {
    const result = store.replaceAll(req.body);
    logger.info({ count: result.length }, 'QA imported');
    auditLog(req, { action: 'qa.import', ok: true, details: { count: result.length } });
    res.json({ count: result.length });
  } catch (err) {
    req.log.error({ err }, 'Failed to import QA');
    auditLog(req, { action: 'qa.import', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/qa/export', authMiddleware(['admin']), (req, res) => {
  const all = store.getAll();
  auditLog(req, { action: 'qa.export', ok: true, details: { count: all.length } });
  res.json(all);
});

router.post('/sync/run', authMiddleware(['admin', 'editor']), async (req, res) => {
  try {
    const summary = await runSync();
    auditLog(req, { action: 'sync.run', ok: true, details: summary });
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, 'Sync run failed');
    auditLog(req, {
      action: 'sync.run',
      ok: false,
      details: { error: err.message }
    });
    res.status(503).json({ error: 'Sync failed' });
  }
});

router.get('/sync/status', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const status = getStatus();
    auditLog(req, { action: 'sync.status', ok: true });
    res.json(status);
  } catch (err) {
    req.log.error({ err }, 'Sync status failed');
    auditLog(req, {
      action: 'sync.status',
      ok: false,
      details: { error: err.message }
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sync/diff', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const diff = getLastDiff();
    auditLog(req, { action: 'sync.diff', ok: true });
    res.json(diff);
  } catch (err) {
    req.log.error({ err }, 'Sync diff failed');
    auditLog(req, {
      action: 'sync.diff',
      ok: false,
      details: { error: err.message }
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
