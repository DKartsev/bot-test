const fs = require('fs');
const path = require('path');
const { HierarchicalNSW } = require('hnswlib-node');
const { embed, initEmbedder } = require('./embedder');
const { logger } = require('../utils/logger');
const { createStore } = require('../data/store');

const TOPK = Number(process.env.SEM_TOPK || '5');
const DATA_BASE = process.env.SEM_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'tenants');

function makeKey(tenant = {}) {
  const t = tenant.orgId || tenant.tenantId || 'default';
  const p = tenant.projectId || 'root';
  return `${t}:${p}`;
}

function resolvePaths(tenant = {}) {
  const tenantId = tenant.orgId || tenant.tenantId || 'default';
  const projectId = tenant.projectId || 'root';
  const root = tenant.basePath || DATA_BASE;
  const tenantBase = path.join(root, tenantId, projectId);
  const dir = path.join(tenantBase, 'semantic');
  return {
    tenantBase,
    dir,
    indexFile: path.join(dir, 'index.bin'),
    metaFile: path.join(dir, 'meta.json')
  };
}

const states = new Map();

function getState(tenant = {}) {
  const key = makeKey(tenant);
  if (!states.has(key)) {
    const paths = resolvePaths(tenant);
    states.set(key, {
      index: null,
      idToIdx: new Map(),
      idxToId: [],
      dim: 0,
      rebuilding: false,
      rebuildTimer: null,
      paths
    });
  }
  const st = states.get(key);
  if (!st.paths) st.paths = resolvePaths(tenant);
  return st;
}

async function rebuildAll(tenant = {}) {
  const st = getState(tenant);
  if (st.rebuilding) return status(tenant);
  st.rebuilding = true;
  const { tenantBase, dir, indexFile, metaFile } = st.paths;
  try {
    await initEmbedder();
    fs.mkdirSync(dir, { recursive: true });
    const store = createStore(tenantBase);
    const items = store.getApproved();
    if (items.length === 0) {
      st.index = null;
      st.idToIdx = new Map();
      st.idxToId = [];
      st.dim = 0;
      fs.writeFileSync(
        metaFile,
        JSON.stringify({ dim: 0, size: 0, updatedAt: new Date().toISOString(), version: 1, ids: [] }, null, 2)
      );
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
    st.dim = vectors[0].length;
    st.index = new HierarchicalNSW('cosine', st.dim);
    st.index.initIndex(vectors.length);
    st.idxToId = [];
    st.idToIdx = new Map();
    vectors.forEach((vec, i) => {
      st.index.addPoint(vec, i);
      const id = items[i].id;
      st.idxToId[i] = id;
      st.idToIdx.set(id, i);
    });
    st.index.writeIndexSync(indexFile);
    const meta = {
      dim: st.dim,
      size: vectors.length,
      updatedAt: new Date().toISOString(),
      version: 1,
      approvedCount: items.length,
      ids: st.idxToId
    };
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    logger.info({ size: vectors.length, dim: st.dim }, 'Semantic index rebuilt');
    return { count: vectors.length, dim: st.dim };
  } catch (err) {
    logger.error({ err }, 'Semantic rebuild failed');
    throw err;
  } finally {
    st.rebuilding = false;
  }
}

async function initSemantic(tenant = {}) {
  const st = getState(tenant);
  const { tenantBase, dir, indexFile, metaFile } = st.paths;
  fs.mkdirSync(dir, { recursive: true });
  if (
    process.env.SEM_REBUILD_ON_START === '1' ||
    !fs.existsSync(indexFile) ||
    !fs.existsSync(metaFile)
  ) {
    await rebuildAll(tenant);
  } else {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      st.idxToId = meta.ids || [];
      st.idToIdx = new Map(st.idxToId.map((id, i) => [id, i]));
      st.dim = meta.dim;
      st.index = new HierarchicalNSW('cosine', st.dim);
      st.index.readIndexSync(indexFile, meta.size);
      logger.info({ size: meta.size, dim: st.dim }, 'Semantic index loaded');
    } catch (err) {
      logger.error({ err }, 'Failed to load semantic index, rebuilding');
      await rebuildAll(tenant);
    }
  }
  const storeInst = createStore(tenantBase);
  storeInst.onUpdated(() => scheduleRebuild(tenant));
  return status(tenant);
}

function scheduleRebuild(tenant = {}) {
  const st = getState(tenant);
  if (st.rebuildTimer) return;
  st.rebuildTimer = setTimeout(async () => {
    st.rebuildTimer = null;
    try {
      await rebuildAll(tenant);
    } catch (err) {
      logger.error({ err }, 'Scheduled semantic rebuild failed');
    }
  }, 1000);
}

async function searchSemantic(query, k = TOPK, tenant = {}) {
  const st = getState(tenant);
  if (!st.index || st.idxToId.length === 0) return [];
  const [vec] = await embed([query]);
  if (!vec) return [];
  const result = st.index.searchKnn(vec, Math.min(k, st.idxToId.length));
  const neighbors = result.neighbors || result[0] || [];
  const distances = result.distances || result[1] || [];
  const out = [];
  for (let i = 0; i < neighbors.length; i++) {
    const id = st.idxToId[neighbors[i]];
    const sim = 1 - distances[i];
    out.push({ id, sim });
  }
  return out;
}

function status(tenant = {}) {
  const st = getState(tenant);
  const { metaFile } = st.paths;
  let updatedAt = null;
  try {
    if (fs.existsSync(metaFile)) {
      updatedAt = JSON.parse(fs.readFileSync(metaFile, 'utf8')).updatedAt;
    }
  } catch (err) {
    logger.error({ err }, 'Failed to read semantic meta');
  }
  return {
    enabled: process.env.SEM_ENABLED === '1',
    provider: process.env.SEM_PROVIDER || 'local_xenova',
    size: st.idxToId.length,
    dim: st.dim,
    updatedAt
  };
}

module.exports = { initSemantic, searchSemantic, rebuildAll, status };
