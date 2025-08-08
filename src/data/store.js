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
  required: ['Question', 'Answer'],
  properties: {
    id: { type: 'string' },
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
};

const entryValidator = ajv.compile(entrySchema);
const entryPatchValidator = ajv.compile({
  type: 'object',
  properties: {
    Question: { type: 'string', minLength: 1 },
    Answer: { type: 'string', minLength: 1 }
  },
  additionalProperties: false,
  minProperties: 1
});

const arrayValidator = ajv.compile({ type: 'array', items: entrySchema });

const emitter = new EventEmitter();
let qaPairs = [];

function ensureDirs() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
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
      const normalized = {
        id: item.id || uuidv4(),
        Question: String(item.Question || ''),
        Answer: String(item.Answer || '')
      };
      if (!item.id) changed = true;
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

function getById(id) {
  return qaPairs.find((q) => q.id === id) || null;
}

function add({ Question, Answer }) {
  const item = { id: uuidv4(), Question, Answer };
  if (!entryValidator(item)) {
    throw new Error('Invalid Q&A entry');
  }
  qaPairs.push(item);
  save();
  emitter.emit('updated');
  return { ...item };
}

function update(id, patch) {
  if (!entryPatchValidator(patch)) {
    throw new Error('Invalid Q&A entry');
  }
  const item = qaPairs.find((q) => q.id === id);
  if (!item) return null;
  const updated = { ...item, ...patch };
  if (!entryValidator(updated)) {
    throw new Error('Invalid Q&A entry');
  }
  item.Question = updated.Question;
  item.Answer = updated.Answer;
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
  if (!arrayValidator(array)) {
    throw new Error('Invalid Q&A array');
  }
  qaPairs = array.map((item) => ({
    id: item.id || uuidv4(),
    Question: item.Question,
    Answer: item.Answer
  }));
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
  getById,
  add,
  update,
  remove,
  replaceAll,
  onUpdated
};

