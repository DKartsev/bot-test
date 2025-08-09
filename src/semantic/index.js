const fs = require('fs');
const path = require('path');
const { HierarchicalNSW } = require('hnswlib-node');
const { embed, initEmbedder } = require('./embedder');
const { logger } = require('../utils/logger');
const { createStore } = require('../data/store');

const INDEX_PATH = process.env.SEM_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'semantic');
const INDEX_FILE = path.join(INDEX_PATH, 'index.bin');
const META_FILE = path.join(INDEX_PATH, 'meta.json');
const TOPK = Number(process.env.SEM_TOPK || '5');

let index = null;
let idToIdx = new Map();
let idxToId = [];
let dim = 0;
let rebuilding = false;
let rebuildTimer = null;

function ensureDir() {
  fs.mkdirSync(INDEX_PATH, { recursive: true });
}

function metaPath() {
  return META_FILE;
}

async function rebuildAll(basePath) {
  if (rebuilding) return status();
  rebuilding = true;
  try {
    await initEmbedder();
    ensureDir();
    const store = createStore(basePath);
    const items = store.getApproved();
    if (items.length === 0) {
      index = null;
      idToIdx = new Map();
      idxToId = [];
      dim = 0;
      fs.writeFileSync(metaPath(), JSON.stringify({ dim: 0, size: 0, updatedAt: new Date().toISOString(), version: 1, ids: [] }, null, 2));
      return { count: 0, dim: 0 };
    }
    const texts = items.map((item) => {
      const arr = [item.Question];
      if (item.translations) {
        for (const t of Object.values(item.translations)) {
          if (t && t.Question) arr.push(t.Question);
        }
      }
      return arr.join('\n');
    });
    const vectors = await embed(texts);
    dim = vectors[0].length;
    index = new HierarchicalNSW('cosine', dim);
    index.initIndex(vectors.length);
    idxToId = [];
    idToIdx = new Map();
    vectors.forEach((vec, i) => {
      index.addPoint(vec, i);
      const id = items[i].id;
      idxToId[i] = id;
      idToIdx.set(id, i);
    });
    index.writeIndexSync(INDEX_FILE);
    const meta = {
      dim,
      size: vectors.length,
      updatedAt: new Date().toISOString(),
      version: 1,
      approvedCount: items.length,
      ids: idxToId
    };
    fs.writeFileSync(metaPath(), JSON.stringify(meta, null, 2));
    logger.info({ size: vectors.length, dim }, 'Semantic index rebuilt');
    return { count: vectors.length, dim };
  } catch (err) {
    logger.error({ err }, 'Semantic rebuild failed');
    throw err;
  } finally {
    rebuilding = false;
  }
}

async function initSemantic(basePath) {
  ensureDir();
  if (
    process.env.SEM_REBUILD_ON_START === '1' ||
    !fs.existsSync(INDEX_FILE) ||
    !fs.existsSync(metaPath())
  ) {
    await rebuildAll(basePath);
  } else {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath(), 'utf8'));
      idxToId = meta.ids || [];
      idToIdx = new Map(idxToId.map((id, i) => [id, i]));
      dim = meta.dim;
      index = new HierarchicalNSW('cosine', dim);
      index.readIndexSync(INDEX_FILE, meta.size);
      logger.info({ size: meta.size, dim }, 'Semantic index loaded');
    } catch (err) {
      logger.error({ err }, 'Failed to load semantic index, rebuilding');
      await rebuildAll(basePath);
    }
  }
  const storeInst = createStore(basePath);
  storeInst.onUpdated(() => scheduleRebuild(basePath));
  return status();
}

function scheduleRebuild(basePath) {
  if (rebuildTimer) return;
  rebuildTimer = setTimeout(async () => {
    rebuildTimer = null;
    try {
      await rebuildAll(basePath);
    } catch (err) {
      logger.error({ err }, 'Scheduled semantic rebuild failed');
    }
  }, 1000);
}

async function searchSemantic(query, k = TOPK) {
  if (!index || idxToId.length === 0) return [];
  const [vec] = await embed([query]);
  if (!vec) return [];
  const result = index.searchKnn(vec, Math.min(k, idxToId.length));
  const neighbors = result.neighbors || result[0] || [];
  const distances = result.distances || result[1] || [];
  const out = [];
  for (let i = 0; i < neighbors.length; i++) {
    const id = idxToId[neighbors[i]];
    const sim = 1 - distances[i];
    out.push({ id, sim });
  }
  return out;
}

function status() {
  let updatedAt = null;
  try {
    if (fs.existsSync(metaPath())) {
      updatedAt = JSON.parse(fs.readFileSync(metaPath(), 'utf8')).updatedAt;
    }
  } catch (err) {
    logger.error({ err }, 'Failed to read semantic meta');
  }
  return {
    enabled: process.env.SEM_ENABLED === '1',
    provider: process.env.SEM_PROVIDER || 'local_xenova',
    size: idxToId.length,
    dim,
    updatedAt
  };
}

module.exports = { initSemantic, searchSemantic, rebuildAll, status };
