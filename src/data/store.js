const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDir, 'qa_pairs.json');
const tempFile = path.join(dataDir, 'qa_pairs.tmp.json');
const backupDir = path.join(dataDir, 'backups');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const entrySchema = {
  type: 'object',
  required: ['id', 'Question', 'Answer', 'status', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 },
    status: { enum: ['approved', 'pending', 'rejected'] },
    source: { enum: ['local', 'openai'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    meta: {
      type: 'object',
      additionalProperties: false,
      properties: {
        model: { type: 'string' },
        score: { type: 'number' },
        requestHash: { type: 'string' },
        notes: { type: 'string' }
      }
    }
  },
  additionalProperties: false
};

const entryValidator = ajv.compile(entrySchema);

const patchValidator = ajv.compile({
  type: 'object',
  properties: {
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 },
    status: { enum: ['approved', 'pending', 'rejected'] },
    meta: { type: 'object' }
  },
  additionalProperties: false,
  minProperties: 1
});

const importEntrySchema = {
  type: 'object',
  required: ['Question', 'Answer'],
  properties: {
    id: { type: 'string' },
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 },
    status: { enum: ['approved', 'pending', 'rejected'] },
    source: { enum: ['local', 'openai'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    meta: { type: 'object' }
  },
  additionalProperties: false
};

const arrayValidator = ajv.compile({ type: 'array', items: importEntrySchema });

const emitter = new EventEmitter();
let qaPairs = [];

function ensureDirs() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
}

function normalizeString(str) {
  return String(str || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function findSimilarPending(question, answer) {
  const nq = normalizeString(question);
  const na = normalizeString(answer);
  return (
    qaPairs.find(
      (item) =>
        item.status === 'pending' &&
        normalizeString(item.Question) === nq &&
        normalizeString(item.Answer) === na
    ) || null
  );
}

function load() {
  ensureDirs();
  if (!fs.existsSync(dataFile)) {
    qaPairs = [];
    save();
    return;
  }
  const raw = fs.readFileSync(dataFile, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    let changed = false;
    qaPairs = parsed.map((item) => {
      const now = new Date().toISOString();
      const normalized = {
        id: item.id || uuidv4(),
        Question: String(item.Question || ''),
        Answer: String(item.Answer || ''),
        status: item.status || 'approved',
        source: item.source,
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || item.createdAt || now,
        meta: item.meta || undefined
      };
      if (
        !item.id ||
        !item.status ||
        !item.createdAt ||
        !item.updatedAt
      )
        changed = true;
      if (!entryValidator(normalized)) throw new Error('Invalid Q&A entry');
      return normalized;
    });
    if (changed) save();
  } catch (err) {
    qaPairs = [];
  }
}

function backup() {
  if (!fs.existsSync(dataFile)) return;
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const backupPath = path.join(backupDir, `qa_pairs.${ts}.json`);
  fs.copyFileSync(dataFile, backupPath);
}

function save() {
  ensureDirs();
  backup();
  fs.writeFileSync(tempFile, JSON.stringify(qaPairs, null, 2));
  fs.renameSync(tempFile, dataFile);
}

function getAll() {
  return JSON.parse(JSON.stringify(qaPairs));
}

function getApproved() {
  return qaPairs.filter((q) => q.status === 'approved').map((q) => ({ ...q }));
}

function getById(id) {
  return qaPairs.find((q) => q.id === id) || null;
}

function addApproved({ Question, Answer, source }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    Question,
    Answer,
    status: 'approved',
    source: source || 'local',
    createdAt: now,
    updatedAt: now
  };
  if (!entryValidator(item)) throw new Error('Invalid Q&A entry');
  qaPairs.push(item);
  save();
  emitter.emit('updated');
  return { ...item };
}

function addPending({ Question, Answer, source = 'openai', meta = {} }) {
  const existing = findSimilarPending(Question, Answer);
  if (existing) return { ...existing };
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    Question,
    Answer,
    status: 'pending',
    source,
    createdAt: now,
    updatedAt: now,
    meta
  };
  if (!entryValidator(item)) throw new Error('Invalid Q&A entry');
  qaPairs.push(item);
  save();
  emitter.emit('updated');
  return { ...item };
}

function update(id, patch) {
  if (!patchValidator(patch)) throw new Error('Invalid Q&A entry');
  const item = qaPairs.find((q) => q.id === id);
  if (!item) return null;
  const updated = { ...item, ...patch, updatedAt: new Date().toISOString() };
  if (!entryValidator(updated)) throw new Error('Invalid Q&A entry');
  Object.assign(item, updated);
  save();
  emitter.emit('updated');
  return { ...item };
}

function approve(id, patch = {}) {
  const item = qaPairs.find((q) => q.id === id);
  if (!item) return null;
  const updated = {
    ...item,
    ...patch,
    status: 'approved',
    updatedAt: new Date().toISOString()
  };
  if (!entryValidator(updated)) throw new Error('Invalid Q&A entry');
  Object.assign(item, updated);
  save();
  emitter.emit('updated');
  return { ...item };
}

function reject(id, reason) {
  const item = qaPairs.find((q) => q.id === id);
  if (!item) return null;
  const ts = new Date().toISOString();
  const notes = reason
    ? `${item.meta?.notes ? item.meta.notes + '\n' : ''}[${ts}] ${reason}`
    : item.meta?.notes;
  const updated = {
    ...item,
    status: 'rejected',
    updatedAt: ts,
    meta: { ...(item.meta || {}), notes }
  };
  if (!entryValidator(updated)) throw new Error('Invalid Q&A entry');
  Object.assign(item, updated);
  save();
  emitter.emit('updated');
  return { ...item };
}

function remove(id) {
  const idx = qaPairs.findIndex((q) => q.id === id);
  if (idx === -1) return false;
  qaPairs.splice(idx, 1);
  save();
  emitter.emit('updated');
  return true;
}

function replaceAll(array) {
  if (!arrayValidator(array)) throw new Error('Invalid Q&A array');
  qaPairs = array.map((item) => {
    const now = new Date().toISOString();
    const normalized = {
      id: item.id || uuidv4(),
      Question: item.Question,
      Answer: item.Answer,
      status: item.status || 'approved',
      source: item.source,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || item.createdAt || now,
      meta: item.meta || undefined
    };
    if (!entryValidator(normalized)) throw new Error('Invalid Q&A entry');
    return normalized;
  });
  save();
  emitter.emit('updated');
  return getAll();
}

function onUpdated(listener) {
  emitter.on('updated', listener);
}

load();

module.exports = {
  load,
  getAll,
  getApproved,
  getById,
  addApproved,
  addPending,
  update,
  approve,
  reject,
  remove,
  replaceAll,
  onUpdated,
  findSimilarPending
};
