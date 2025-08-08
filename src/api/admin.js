const express = require('express');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
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

const entryValidator = ajv.compile(entrySchema);
const patchValidator = ajv.compile(patchSchema);
const arrayValidator = ajv.compile({ type: 'array', items: entrySchema });

router.get('/qa', (req, res) => {
  res.json(store.getAll());
});

router.post('/qa', (req, res) => {
  if (!entryValidator(req.body)) {
    return res.status(400).json({ error: 'Validation error', details: entryValidator.errors });
  }
  try {
    const item = store.add(req.body);
    logger.info({ id: item.id }, 'QA added');
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'Failed to add QA');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/qa/:id', (req, res) => {
  if (!patchValidator(req.body)) {
    return res.status(400).json({ error: 'Validation error', details: patchValidator.errors });
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
    return res.status(400).json({ error: 'Validation error', details: arrayValidator.errors });
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
