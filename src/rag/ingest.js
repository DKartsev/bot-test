const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const { JSDOM } = require('jsdom');
const Turndown = require('turndown');
const { randomUUID } = require('crypto');
const { chunkText } = require('./chunker');
const { logger } = require('../utils/logger');

const DATA_DIR = process.env.RAG_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'rag');
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json');
const CHUNKS_FILE = path.join(DATA_DIR, 'chunks.jsonl');

function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSources() {
  try {
    if (!fs.existsSync(SOURCES_FILE)) return [];
    return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8'));
  } catch (err) {
    logger.error({ err }, 'Failed to read sources.json');
    return [];
  }
}

function writeSources(arr) {
  try {
    const tmp = SOURCES_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(arr, null, 2));
    fs.renameSync(tmp, SOURCES_FILE);
  } catch (err) {
    logger.error({ err }, 'Failed to write sources.json');
  }
}

function appendChunks(chunks, sourceId) {
  const lines = chunks.map((c) => {
    const obj = { ...c, sourceId };
    return JSON.stringify(obj);
  });
  fs.appendFileSync(CHUNKS_FILE, lines.join('\n') + '\n');
}

async function ingestText(text, meta = {}) {
  ensureDir();
  const raw = text.toString();
  const hash = sha1(raw);
  const now = new Date().toISOString();
  const source = {
    id: randomUUID().replace(/-/g, ''),
    title: meta.title || 'Untitled',
    type: meta.type || 'txt',
    path: meta.path,
    url: meta.url,
    lang: meta.lang,
    hash,
    tokens: Math.round(raw.length / 4),
    createdAt: now,
    updatedAt: now
  };
  const chunks = chunkText(raw, { title: source.title });
  const sources = readSources();
  sources.push(source);
  writeSources(sources);
  appendChunks(chunks, source.id);
  return { source, chunks };
}

async function ingestFile(filePath, meta = {}) {
  ensureDir();
  const buf = fs.readFileSync(filePath);
  const mime = meta.mime || '';
  const ext = path.extname(meta.originalName || '').toLowerCase();
  let type = 'txt';
  let text = '';
  try {
    if (mime.includes('pdf') || ext === '.pdf') {
      type = 'pdf';
      const data = await pdfParse(buf);
      text = data.text || '';
    } else if (mime.includes('html') || ext === '.html' || ext === '.htm') {
      type = 'html';
      const html = buf.toString('utf8');
      const dom = new JSDOM(html);
      const td = new Turndown();
      text = td.turndown(dom.window.document.body.innerHTML);
      if (!meta.title) meta.title = dom.window.document.title || undefined;
    } else if (ext === '.md' || ext === '.markdown') {
      type = 'md';
      text = buf.toString('utf8');
    } else {
      type = 'txt';
      text = buf.toString('utf8');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to parse file');
    throw err;
  }
  meta.type = type;
  const { source, chunks } = await ingestText(text, meta);
  try {
    const dest = path.join(DATA_DIR, `${source.id}${ext || ''}`);
    fs.copyFileSync(filePath, dest);
    source.path = dest;
    const sources = readSources();
    const idx = sources.findIndex((s) => s.id === source.id);
    if (idx >= 0) {
      sources[idx].path = dest;
      writeSources(sources);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to store original file');
  }
  return { source, chunks };
}

module.exports = { ingestFile, ingestText };
