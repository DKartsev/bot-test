const fs = require('fs');
const path = require('path');
const { HierarchicalNSW } = require('hnswlib-node');
const { logger } = require('../utils/logger');

const DATA_DIR = process.env.RAG_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'rag');
const INDEX_FILE = path.join(DATA_DIR, 'index.bin');
const META_FILE = path.join(DATA_DIR, 'meta.json');
const CHUNKS_FILE = path.join(DATA_DIR, 'chunks.jsonl');

let index = null;
let dim = 0;
let chunkMeta = new Map();
let chunkIdToIdx = new Map();
let idxToChunkId = [];
let embedder = null;

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readChunksFile() {
  const arr = [];
  try {
    if (!fs.existsSync(CHUNKS_FILE)) return arr;
    const lines = fs.readFileSync(CHUNKS_FILE, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        arr.push(obj);
      } catch (err) {
        logger.warn({ err }, 'Failed to parse chunk line');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Failed to read chunks.jsonl');
  }
  return arr;
}

async function rebuildAll() {
  ensureDir();
  const all = readChunksFile();
  chunkMeta = new Map();
  chunkIdToIdx = new Map();
  idxToChunkId = [];
  if (all.length === 0) {
    index = null;
    dim = 0;
    fs.writeFileSync(
      META_FILE,
      JSON.stringify({ dim: 0, size: 0, updatedAt: new Date().toISOString() }, null, 2)
    );
    return { size: 0, dim: 0 };
  }
  await embedderReady();
  const texts = all.map((c) => c.text);
  const vectors = await embedder.embed(texts);
  dim = vectors[0].length;
  index = new HierarchicalNSW('cosine', dim);
  index.initIndex(vectors.length);
  vectors.forEach((vec, i) => {
    index.addPoint(vec, i);
    const id = all[i].id;
    idxToChunkId[i] = id;
    chunkIdToIdx.set(id, i);
    chunkMeta.set(id, all[i]);
  });
  index.writeIndexSync(INDEX_FILE);
  fs.writeFileSync(
    META_FILE,
    JSON.stringify({ dim, size: vectors.length, updatedAt: new Date().toISOString(), ids: idxToChunkId }, null, 2)
  );
  logger.info({ size: vectors.length, dim }, 'RAG index rebuilt');
  return { size: vectors.length, dim };
}

async function embedderReady() {
  if (!embedder) return;
  if (embedder.initEmbedder) await embedder.initEmbedder();
}

async function initRagIndex(embed) {
  embedder = embed;
  await embedderReady();
  ensureDir();
  if (process.env.RAG_REBUILD_ON_START === '1' || !fs.existsSync(INDEX_FILE)) {
    return rebuildAll();
  }
  try {
    const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    dim = meta.dim;
    index = new HierarchicalNSW('cosine', dim);
    index.readIndexSync(INDEX_FILE, meta.size);
    idxToChunkId = meta.ids || [];
    chunkIdToIdx = new Map(idxToChunkId.map((id, i) => [id, i]));
    const all = readChunksFile();
    chunkMeta = new Map(all.map((c) => [c.id, c]));
    logger.info({ size: meta.size, dim }, 'RAG index loaded');
    return { size: meta.size, dim };
  } catch (err) {
    logger.error({ err }, 'Failed to load RAG index, rebuilding');
    return rebuildAll();
  }
}

async function upsertChunks(chunks = []) {
  if (!chunks.length) return;
  await embedderReady();
  const texts = chunks.map((c) => c.text);
  const vectors = await embedder.embed(texts);
  if (!index) {
    dim = vectors[0].length;
    index = new HierarchicalNSW('cosine', dim);
    index.initIndex(vectors.length);
    idxToChunkId = [];
    chunkIdToIdx = new Map();
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const vec = vectors[i];
    const idx = idxToChunkId.length;
    index.addPoint(vec, idx);
    idxToChunkId[idx] = c.id;
    chunkIdToIdx.set(c.id, idx);
    chunkMeta.set(c.id, c);
  }
  index.writeIndexSync(INDEX_FILE);
  fs.writeFileSync(
    META_FILE,
    JSON.stringify({ dim, size: idxToChunkId.length, updatedAt: new Date().toISOString(), ids: idxToChunkId }, null, 2)
  );
}

async function removeSource(sourceId) {
  const all = readChunksFile().filter((c) => c.sourceId !== sourceId);
  const tmp = CHUNKS_FILE + '.tmp';
  fs.writeFileSync(tmp, all.map((c) => JSON.stringify(c)).join('\n') + (all.length ? '\n' : ''));
  fs.renameSync(tmp, CHUNKS_FILE);
  try {
    const srcFile = path.join(DATA_DIR, 'sources.json');
    let sources = [];
    if (fs.existsSync(srcFile)) {
      sources = JSON.parse(fs.readFileSync(srcFile, 'utf8')).filter((s) => s.id !== sourceId);
      const tmp2 = srcFile + '.tmp';
      fs.writeFileSync(tmp2, JSON.stringify(sources, null, 2));
      fs.renameSync(tmp2, srcFile);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to update sources on remove');
  }
  return rebuildAll();
}

async function searchChunks(query, k) {
  if (!index || idxToChunkId.length === 0) return [];
  await embedderReady();
  const [vec] = await embedder.embed([query]);
  if (!vec) return [];
  const topk = k || Number(process.env.RAG_TOPK || '6');
  const result = index.searchKnn(vec, Math.min(topk, idxToChunkId.length));
  const neighbors = result.neighbors || result[0] || [];
  const distances = result.distances || result[1] || [];
  const out = [];
  for (let i = 0; i < neighbors.length; i++) {
    const chunkId = idxToChunkId[neighbors[i]];
    const meta = chunkMeta.get(chunkId);
    if (!meta) continue;
    const sim = 1 - distances[i];
    out.push({ chunkId, sourceId: meta.sourceId, sim, text: meta.text, title: meta.title, headings: meta.headings, start: meta.start, end: meta.end });
  }
  return out;
}

function status() {
  let updatedAt = null;
  try {
    if (fs.existsSync(META_FILE)) {
      updatedAt = JSON.parse(fs.readFileSync(META_FILE, 'utf8')).updatedAt;
    }
  } catch (err) {
    logger.error({ err }, 'Failed to read RAG meta');
  }
  return { size: idxToChunkId.length, dim, updatedAt };
}

module.exports = { initRagIndex, upsertChunks, removeSource, searchChunks, status, rebuildAll };
