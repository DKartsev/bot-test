const fs = require('fs');
const path = require('path');
const { HierarchicalNSW } = require('hnswlib-node');
const { logger } = require('../utils/logger');

const DATA_BASE = process.env.RAG_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'tenants');

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
  const dir = path.join(tenantBase, 'rag');
  return {
    tenantBase,
    dir,
    indexFile: path.join(dir, 'index.bin'),
    metaFile: path.join(dir, 'meta.json'),
    chunksFile: path.join(dir, 'chunks.jsonl'),
    sourcesFile: path.join(dir, 'sources.json')
  };
}

const states = new Map();

function getState(tenant = {}) {
  const key = makeKey(tenant);
  if (!states.has(key)) {
    const paths = resolvePaths(tenant);
    states.set(key, {
      index: null,
      dim: 0,
      chunkMeta: new Map(),
      chunkIdToIdx: new Map(),
      idxToChunkId: [],
      paths
    });
  }
  const st = states.get(key);
  if (!st.paths) st.paths = resolvePaths(tenant);
  return st;
}

function readChunksFile(file) {
  const arr = [];
  try {
    if (!fs.existsSync(file)) return arr;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
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

let embedder = null;

async function embedderReady() {
  if (!embedder) return;
  if (embedder.initEmbedder) await embedder.initEmbedder();
}

async function rebuildAll(tenant = {}) {
  const st = getState(tenant);
  const { dir, chunksFile, indexFile, metaFile } = st.paths;
  fs.mkdirSync(dir, { recursive: true });
  const all = readChunksFile(chunksFile);
  st.chunkMeta = new Map();
  st.chunkIdToIdx = new Map();
  st.idxToChunkId = [];
  if (all.length === 0) {
    st.index = null;
    st.dim = 0;
    fs.writeFileSync(
      metaFile,
      JSON.stringify({ dim: 0, size: 0, updatedAt: new Date().toISOString() }, null, 2)
    );
    return { size: 0, dim: 0 };
  }
  await embedderReady();
  const texts = all.map((c) => c.text);
  const vectors = await embedder.embed(texts);
  st.dim = vectors[0].length;
  st.index = new HierarchicalNSW('cosine', st.dim);
  st.index.initIndex(vectors.length);
  vectors.forEach((vec, i) => {
    st.index.addPoint(vec, i);
    const id = all[i].id;
    st.idxToChunkId[i] = id;
    st.chunkIdToIdx.set(id, i);
    st.chunkMeta.set(id, all[i]);
  });
  st.index.writeIndexSync(indexFile);
  fs.writeFileSync(
    metaFile,
    JSON.stringify({ dim: st.dim, size: vectors.length, updatedAt: new Date().toISOString(), ids: st.idxToChunkId }, null, 2)
  );
  logger.info({ size: vectors.length, dim: st.dim }, 'RAG index rebuilt');
  return { size: vectors.length, dim: st.dim };
}

async function initRagIndex({ embed, ...tenant } = {}) {
  embedder = embed;
  await embedderReady();
  const st = getState(tenant);
  const { dir, indexFile, metaFile, chunksFile } = st.paths;
  fs.mkdirSync(dir, { recursive: true });
  if (process.env.RAG_REBUILD_ON_START === '1' || !fs.existsSync(indexFile)) {
    return rebuildAll(tenant);
  }
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    st.dim = meta.dim;
    st.index = new HierarchicalNSW('cosine', st.dim);
    st.index.readIndexSync(indexFile, meta.size);
    st.idxToChunkId = meta.ids || [];
    st.chunkIdToIdx = new Map(st.idxToChunkId.map((id, i) => [id, i]));
    const all = readChunksFile(chunksFile);
    st.chunkMeta = new Map(all.map((c) => [c.id, c]));
    logger.info({ size: meta.size, dim: st.dim }, 'RAG index loaded');
    return { size: meta.size, dim: st.dim };
  } catch (err) {
    logger.error({ err }, 'Failed to load RAG index, rebuilding');
    return rebuildAll(tenant);
  }
}

async function upsertChunks(chunks = [], tenant = {}) {
  if (!chunks.length) return;
  const st = getState(tenant);
  const { indexFile, metaFile } = st.paths;
  await embedderReady();
  const texts = chunks.map((c) => c.text);
  const vectors = await embedder.embed(texts);
  if (!st.index) {
    st.dim = vectors[0].length;
    st.index = new HierarchicalNSW('cosine', st.dim);
    st.index.initIndex(vectors.length);
    st.idxToChunkId = [];
    st.chunkIdToIdx = new Map();
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const vec = vectors[i];
    const idx = st.idxToChunkId.length;
    st.index.addPoint(vec, idx);
    st.idxToChunkId[idx] = c.id;
    st.chunkIdToIdx.set(c.id, idx);
    st.chunkMeta.set(c.id, c);
  }
  st.index.writeIndexSync(indexFile);
  fs.writeFileSync(
    metaFile,
    JSON.stringify({ dim: st.dim, size: st.idxToChunkId.length, updatedAt: new Date().toISOString(), ids: st.idxToChunkId }, null, 2)
  );
}

async function removeSource(sourceId, tenant = {}) {
  const st = getState(tenant);
  const { chunksFile, sourcesFile } = st.paths;
  const all = readChunksFile(chunksFile).filter((c) => c.sourceId !== sourceId);
  const tmp = chunksFile + '.tmp';
  fs.writeFileSync(tmp, all.map((c) => JSON.stringify(c)).join('\n') + (all.length ? '\n' : ''));
  fs.renameSync(tmp, chunksFile);
  try {
    let sources = [];
    if (fs.existsSync(sourcesFile)) {
      sources = JSON.parse(fs.readFileSync(sourcesFile, 'utf8')).filter((s) => s.id !== sourceId);
      const tmp2 = sourcesFile + '.tmp';
      fs.writeFileSync(tmp2, JSON.stringify(sources, null, 2));
      fs.renameSync(tmp2, sourcesFile);
    }
  } catch (err) {
    logger.error({ err }, 'Failed to update sources on remove');
  }
  return rebuildAll(tenant);
}

async function searchChunks(query, k, tenant = {}) {
  const st = getState(tenant);
  if (!st.index || st.idxToChunkId.length === 0) return [];
  await embedderReady();
  const [vec] = await embedder.embed([query]);
  if (!vec) return [];
  const topk = k || Number(process.env.RAG_TOPK || '6');
  const result = st.index.searchKnn(vec, Math.min(topk, st.idxToChunkId.length));
  const neighbors = result.neighbors || result[0] || [];
  const distances = result.distances || result[1] || [];
  const out = [];
  for (let i = 0; i < neighbors.length; i++) {
    const chunkId = st.idxToChunkId[neighbors[i]];
    const meta = st.chunkMeta.get(chunkId);
    if (!meta) continue;
    const sim = 1 - distances[i];
    out.push({
      chunkId,
      sourceId: meta.sourceId,
      sim,
      text: meta.text,
      title: meta.title,
      headings: meta.headings,
      start: meta.start,
      end: meta.end
    });
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
    logger.error({ err }, 'Failed to read RAG meta');
  }
  return { size: st.idxToChunkId.length, dim: st.dim, updatedAt };
}

module.exports = { initRagIndex, upsertChunks, removeSource, searchChunks, status, rebuildAll };
