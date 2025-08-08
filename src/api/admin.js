const express = require('express');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const store = require('../data/store');

const router = express.Router();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

router.use((req, res, next) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

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

router.get('/qa/pending', (req, res) => {
  const pending = store.getAll().filter((i) => i.status === 'pending');
  res.json(pending);
});

router.post('/qa/pending/:id/approve', (req, res) => {
  if (!approveValidator(req.body || {})) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: approveValidator.errors });
  }
  try {
    const item = store.approve(req.params.id, req.body || {});
    if (!item) return res.status(404).json({ error: 'Not found' });
    const editor = req.headers['x-editor'];
    logModeration('approve', req.params.id, editor, req.body);
    logger.info({ id: req.params.id, editor, changes: req.body }, 'QA approved');
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'Failed to approve QA');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/qa/pending/:id/reject', (req, res) => {
  if (!rejectValidator(req.body || {})) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: rejectValidator.errors });
  }
  try {
    const item = store.reject(req.params.id, req.body?.reason);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const editor = req.headers['x-editor'];
    logModeration('reject', req.params.id, editor, req.body);
    logger.info({ id: req.params.id, editor, reason: req.body?.reason }, 'QA rejected');
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'Failed to reject QA');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/qa/:id', (req, res) => {
  const item = store.getById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.get('/qa', (req, res) => {
  res.json(store.getAll());
});

router.post('/qa', (req, res) => {
  if (!entryValidator(req.body)) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: entryValidator.errors });
  }
  try {
    const item = store.addApproved(req.body);
    logger.info({ id: item.id }, 'QA added');
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'Failed to add QA');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/qa/:id', (req, res) => {
  if (!patchValidator(req.body)) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: patchValidator.errors });
  }
  try {
    const updated = store.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    logger.info({ id: req.params.id }, 'QA updated');
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, 'Failed to update QA');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/qa/:id', (req, res) => {
  try {
    const ok = store.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    logger.info({ id: req.params.id }, 'QA removed');
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, 'Failed to delete QA');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/qa/import', (req, res) => {
  if (!arrayValidator(req.body)) {
    return res
      .status(400)
      .json({ error: 'Validation error', details: arrayValidator.errors });
  }
  try {
    const result = store.replaceAll(req.body);
    logger.info({ count: result.length }, 'QA imported');
    res.json({ count: result.length });
  } catch (err) {
    req.log.error({ err }, 'Failed to import QA');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/qa/export', (req, res) => {
  res.json(store.getAll());
});

module.exports = router;
