const express = require('express');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { createStore } = require('../data/store');
const store = createStore();
const { tenantCtx } = require('../tenancy/tenantCtx');
const { authMiddleware, auditLog } = require('../utils/security');
const ExcelJS = require('exceljs');
const { liveBus } = require('../live/bus');
const { runSync, getStatus, getLastDiff } = require('../sync/engine');
const { recomputeAll, getSnapshot, suggestActions, applyAutoActions } = require('../feedback/engine');
const versionsRouter = require('./versions');
const { rebuildAll: rebuildSemantic, status: semanticStatus } = require('../semantic/index');
const multer = require('multer');
const {
  ingestFile,
  ingestText
} = require('../rag/ingest');
const {
  upsertChunks,
  removeSource,
  searchChunks,
  status: ragStatus,
  rebuildAll: rebuildRag
} = require('../rag/index');

const router = express.Router();
router.use(tenantCtx());

router.use('/versions', versionsRouter);

const upload = multer({ dest: path.join(__dirname, '..', '..', 'data', 'tmp') });

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const translationEntry = {
  type: 'object',
  properties: {
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
};

const translationsSchema = {
  type: 'object',
  propertyNames: { type: 'string', pattern: '^[a-zA-Z-]{2,5}$' },
  additionalProperties: translationEntry
};

const variablesSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      required: { type: 'boolean' },
      description: { type: 'string' }
    },
    additionalProperties: false
  }
};

const entrySchema = {
  type: 'object',
  required: ['Question', 'Answer'],
  properties: {
    id: { type: 'string' },
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 },
    translations: translationsSchema,
    variables: variablesSchema
  },
  additionalProperties: false
};

const patchSchema = {
  type: 'object',
  properties: {
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 },
    translations: translationsSchema,
    variables: variablesSchema
  },
  additionalProperties: false,
  minProperties: 1
};

const approveSchema = {
  type: 'object',
  properties: {
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 },
    translations: translationsSchema,
    variables: variablesSchema,
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
    liveBus.emit('moderation', {
      ts: new Date().toISOString(),
      action: 'approve',
      id: req.params.id,
      editor,
      changes: req.body
    });
    auditLog(req, {
      action: 'qa.pending.approve',
      ok: true,
      details: {
        id: req.params.id,
        langs: Object.keys(req.body.translations || {}),
        vars: (req.body.variables || []).map((v) => v.name)
      }
    });
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
    liveBus.emit('moderation', {
      ts: new Date().toISOString(),
      action: 'reject',
      id: req.params.id,
      editor,
      changes: req.body
    });
    auditLog(req, { action: 'qa.pending.reject', ok: true, details: { id: req.params.id } });
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'Failed to reject QA');
    auditLog(req, { action: 'qa.pending.reject', ok: false, details: { id: req.params.id, error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
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
    auditLog(req, {
      action: 'qa.create',
      ok: true,
      details: {
        id: item.id,
        langs: Object.keys(req.body.translations || {}),
        vars: (req.body.variables || []).map((v) => v.name)
      }
    });
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
    liveBus.emit('moderation', {
      ts: new Date().toISOString(),
      action: 'update',
      id: req.params.id,
      editor: req.headers['x-editor'],
      changes: req.body
    });
    auditLog(req, {
      action: 'qa.update',
      ok: true,
      details: {
        id: req.params.id,
        langs: Object.keys(req.body.translations || {}),
        vars: (req.body.variables || []).map((v) => v.name)
      }
    });
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

router.get('/export/xlsx', authMiddleware(['admin', 'editor']), async (req, res) => {
  try {
    const all = store.getAll();
    const approved = all.filter((i) => i.status === 'approved');
    const pending = all.filter((i) => i.status === 'pending');
    const wb = new ExcelJS.Workbook();
    const s1 = wb.addWorksheet('Approved');
    s1.columns = [
      { header: 'id', key: 'id', width: 36 },
      { header: 'Question', key: 'Question', width: 50 },
      { header: 'Answer', key: 'Answer', width: 50 },
      { header: 'lang', key: 'lang', width: 10 },
      { header: 'createdAt', key: 'createdAt', width: 24 },
      { header: 'updatedAt', key: 'updatedAt', width: 24 }
    ];
    approved.forEach((i) => s1.addRow(i));
    const s2 = wb.addWorksheet('Pending');
    s2.columns = [
      { header: 'id', key: 'id', width: 36 },
      { header: 'Question', key: 'Question', width: 50 },
      { header: 'Answer', key: 'Answer', width: 50 },
      { header: 'source', key: 'source', width: 15 },
      { header: 'createdAt', key: 'createdAt', width: 24 }
    ];
    pending.forEach((i) => s2.addRow(i));
    const s3 = wb.addWorksheet('Stats');
    const pendingTotal = pending.length;
    const itemsTotal = approved.length;
    const openaiShare = all.length ? pending.filter((p) => p.source === 'openai').length / all.length : 0;
    s3.addRow(['pendingTotal', pendingTotal]);
    s3.addRow(['itemsTotal', itemsTotal]);
    s3.addRow(['openaiShare', openaiShare]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"');
    await wb.xlsx.write(res);
    res.end();
    auditLog(req, {
      action: 'export.xlsx',
      ok: true,
      details: { approved: approved.length, pending: pending.length }
    });
  } catch (err) {
    req.log.error({ err }, 'Export xlsx failed');
    auditLog(req, { action: 'export.xlsx', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/export/csv', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const approved = store.getAll().filter((i) => i.status === 'approved');
    const header = 'id,Question,Answer,lang,createdAt,updatedAt\n';
    const rows = approved
      .map((i) =>
        [i.id, i.Question, i.Answer, i.lang || '', i.createdAt, i.updatedAt]
          .map((v) => '"' + (v ? String(v).replace(/"/g, '""') : '') + '"')
          .join(',')
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
    res.send(header + rows);
    auditLog(req, {
      action: 'export.csv',
      ok: true,
      details: { count: approved.length }
    });
  } catch (err) {
    req.log.error({ err }, 'Export csv failed');
    auditLog(req, { action: 'export.csv', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Export failed' });
  }
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

router.post('/feedback/recompute', authMiddleware(['admin', 'editor']), async (req, res) => {
  try {
    const snapshot = await recomputeAll();
    auditLog(req, { action: 'fb.recompute', ok: true });
    res.json(snapshot);
  } catch (err) {
    req.log.error({ err }, 'Feedback recompute failed');
    auditLog(req, { action: 'fb.recompute', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/feedback/snapshot', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const snap = getSnapshot();
    auditLog(req, { action: 'fb.snapshot', ok: true });
    res.json(snap);
  } catch (err) {
    req.log.error({ err }, 'Feedback snapshot failed');
    auditLog(req, { action: 'fb.snapshot', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/feedback/suggest', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const suggestions = suggestActions();
    auditLog(req, { action: 'fb.suggest', ok: true });
    res.json(suggestions);
  } catch (err) {
    req.log.error({ err }, 'Feedback suggest failed');
    auditLog(req, { action: 'fb.suggest', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/feedback/apply-auto', authMiddleware(['admin']), async (req, res) => {
  try {
    const summary = await applyAutoActions(store);
    auditLog(req, { action: 'fb.applyAuto', ok: true, details: summary });
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, 'Feedback apply-auto failed');
    auditLog(req, { action: 'fb.applyAuto', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/feedback/item/:id', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const snap = getSnapshot();
    const data =
      snap.items[req.params.id] || {
        total: 0,
        pos: 0,
        neg: 0,
        neu: 0,
        posRatio: 0,
        wilson: 0
      };
    auditLog(req, { action: 'fb.item', ok: true, details: { id: req.params.id } });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, 'Feedback item failed');
    auditLog(req, { action: 'fb.item', ok: false, details: { id: req.params.id, error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/semantic/rebuild', authMiddleware(['admin', 'editor']), async (req, res) => {
  try {
    const summary = await rebuildSemantic(req.tenant);
    auditLog(req, { action: 'sem.rebuild', ok: true, details: summary });
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, 'Semantic rebuild failed');
    auditLog(req, { action: 'sem.rebuild', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Rebuild failed' });
  }
});

router.get('/semantic/status', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const st = semanticStatus(req.tenant);
    auditLog(req, { action: 'sem.status', ok: true });
    res.json(st);
  } catch (err) {
    req.log.error({ err }, 'Semantic status failed');
    auditLog(req, { action: 'sem.status', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- RAG routes
router.post('/rag/upload', authMiddleware(['admin', 'editor']), upload.single('file'), async (req, res) => {
  if (!req.file) {
    auditLog(req, { action: 'rag.upload', ok: false, details: { error: 'No file' } });
    return res.status(400).json({ error: 'No file' });
  }
  try {
    const { source, chunks } = await ingestFile(req.file.path, {
      originalName: req.file.originalname,
      mime: req.file.mimetype
    });
    const enriched = chunks.map((c) => ({ ...c, sourceId: source.id }));
    await upsertChunks(enriched, req.tenant);
    auditLog(req, { action: 'rag.upload', ok: true, details: { id: source.id, chunks: enriched.length } });
    liveBus.emit('rag.uploaded', { id: source.id, title: source.title, chunks: enriched.length });
    res.json({ ok: true, source, added: enriched.length });
  } catch (err) {
    req.log.error({ err }, 'RAG upload failed');
    auditLog(req, { action: 'rag.upload', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rag/text', authMiddleware(['admin', 'editor']), async (req, res) => {
  const { title, text, lang } = req.body || {};
  if (!title || !text) {
    auditLog(req, { action: 'rag.text', ok: false, details: { error: 'Missing title or text' } });
    return res.status(400).json({ error: 'Missing title or text' });
  }
  try {
    const { source, chunks } = await ingestText(text, { title, lang, type: 'txt' });
    const enriched = chunks.map((c) => ({ ...c, sourceId: source.id }));
    await upsertChunks(enriched, req.tenant);
    auditLog(req, { action: 'rag.text', ok: true, details: { id: source.id, chunks: enriched.length } });
    res.json({ ok: true, source, added: enriched.length });
  } catch (err) {
    req.log.error({ err }, 'RAG text ingest failed');
    auditLog(req, { action: 'rag.text', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/rag/sources', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const base = process.env.RAG_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'tenants');
    const file = path.join(base, req.tenant.orgId, req.tenant.projectId, 'rag', 'sources.json');
    const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    auditLog(req, { action: 'rag.sources', ok: true, details: { count: list.length } });
    res.json(list);
  } catch (err) {
    req.log.error({ err }, 'RAG sources failed');
    auditLog(req, { action: 'rag.sources', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/rag/source/:id', authMiddleware(['admin', 'editor']), async (req, res) => {
  try {
    await removeSource(req.params.id, req.tenant);
    auditLog(req, { action: 'rag.delete', ok: true, details: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, 'RAG delete failed');
    auditLog(req, { action: 'rag.delete', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rag/reindex', authMiddleware(['admin', 'editor']), async (req, res) => {
  try {
    const result = await rebuildRag(req.tenant);
    auditLog(req, { action: 'rag.reindex', ok: true, details: result });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, 'RAG reindex failed');
    auditLog(req, { action: 'rag.reindex', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/rag/search', authMiddleware(['admin', 'editor']), async (req, res) => {
  const q = req.query.q || '';
  try {
    const items = await searchChunks(q, Number(req.query.k), req.tenant);
    auditLog(req, { action: 'rag.search', ok: true, details: { q, count: items.length } });
    res.json(items);
  } catch (err) {
    req.log.error({ err }, 'RAG search failed');
    auditLog(req, { action: 'rag.search', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/rag/status', authMiddleware(['admin', 'editor']), (req, res) => {
  try {
    const st = ragStatus(req.tenant);
    auditLog(req, { action: 'rag.status', ok: true });
    res.json(st);
  } catch (err) {
    req.log.error({ err }, 'RAG status failed');
    auditLog(req, { action: 'rag.status', ok: false, details: { error: err.message } });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
