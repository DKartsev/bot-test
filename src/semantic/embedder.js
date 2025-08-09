const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

const providerName = process.env.SEM_PROVIDER || 'local_xenova';
const modelLocal = process.env.SEM_MODEL_LOCAL || 'Xenova/all-MiniLM-L6-v2';
const openaiModel = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const batchSize = parseInt(process.env.SEM_BATCH_SIZE || '64', 10);
const cacheEnabled = process.env.SEM_CACHE === '1';
const indexPath = process.env.SEM_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'semantic');
const cacheFile = path.join(indexPath, 'cache.jsonl');

let embedder = null;
const cache = new Map();
let cacheLoaded = false;

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function vecToBase64(vec) {
  const buf = Buffer.from(new Float32Array(vec).buffer);
  return buf.toString('base64');
}

function base64ToVec(str) {
  const buf = Buffer.from(str, 'base64');
  const arr = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  return Array.from(arr);
}

function loadCache() {
  if (!cacheEnabled || cacheLoaded) return;
  cacheLoaded = true;
  try {
    if (!fs.existsSync(cacheFile)) return;
    const lines = fs.readFileSync(cacheFile, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const { t, v } = JSON.parse(line);
        cache.set(t, base64ToVec(v));
      } catch (err) {
        logger.warn({ err }, 'Failed to parse semantic cache line');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Failed to load semantic cache');
  }
}

function appendCache(hash, vector) {
  if (!cacheEnabled) return;
  try {
    const line = JSON.stringify({ t: hash, v: vecToBase64(vector) }) + '\n';
    fs.appendFileSync(cacheFile, line);
  } catch (err) {
    logger.error({ err }, 'Failed to append semantic cache');
  }
}

async function initEmbedder() {
  if (embedder) return embedder;
  loadCache();
  if (providerName === 'local_xenova') {
    try {
      const { pipeline } = require('@xenova/transformers');
      embedder = await pipeline('feature-extraction', modelLocal);
      logger.info({ provider: providerName, model: modelLocal }, 'Semantic embedder initialized');
    } catch (err) {
      logger.error({ err }, 'Failed to init local embedder');
      throw err;
    }
  } else if (providerName === 'openai') {
    try {
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      embedder = { client };
      logger.info({ provider: providerName, model: openaiModel }, 'Semantic embedder initialized');
    } catch (err) {
      logger.error({ err }, 'Failed to init OpenAI embedder');
      throw err;
    }
  } else {
    throw new Error(`Unknown SEM_PROVIDER: ${providerName}`);
  }
  return embedder;
}

function normalize(vec) {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

async function embed(texts = []) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  await initEmbedder();
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    if (providerName === 'local_xenova') {
      // Process sequentially to respect memory limits
      for (const text of batch) {
        const hash = sha1(text);
        if (cache.has(hash)) {
          results.push(cache.get(hash));
          continue;
        }
        const output = await embedder(text, { pooling: 'mean', normalize: true });
        const vec = Array.from(output.data || output);
        cache.set(hash, vec);
        appendCache(hash, vec);
        results.push(vec);
      }
    } else {
      // OpenAI provider supports batching
      const { client } = embedder;
      try {
        const resp = await client.embeddings.create({ model: openaiModel, input: batch });
        for (let j = 0; j < resp.data.length; j++) {
          const text = batch[j];
          const hash = sha1(text);
          let vec = resp.data[j].embedding || [];
          vec = normalize(vec);
          cache.set(hash, vec);
          appendCache(hash, vec);
          results.push(vec);
        }
      } catch (err) {
        logger.error({ err }, 'OpenAI embedding failed');
        throw err;
      }
    }
  }
  return results;
}

module.exports = { initEmbedder, embed };
