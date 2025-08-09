const Fuse = require('fuse.js');
const fuseConfig = require('./fuseConfig');
const store = require('../data/store');

const indices = new Map();

function buildIndex(basePath) {
  store.setBasePath(basePath);
  const data = store.getApproved().map((item) => {
    const searchTexts = [item.Question];
    if (item.translations) {
      for (const t of Object.values(item.translations)) {
        if (t && t.Question) searchTexts.push(t.Question);
      }
    }
    return { id: item.id, Question: item.Question, searchTexts, itemRef: item };
  });
  const fuse = new Fuse(data, { ...fuseConfig, keys: ['Question', 'searchTexts'] });
  indices.set(basePath, { fuse, data });
}

store.onUpdated(() => {
  indices.clear();
});

function getFuse(basePath) {
  if (!indices.has(basePath)) buildIndex(basePath);
  return indices.get(basePath);
}

function fuzzySearch(query, limit = 5, tenant) {
  if (!query) return [];
  const basePath = tenant?.basePath;
  const { fuse } = getFuse(basePath);
  return fuse.search(query, { limit }).map(({ item, score }) => ({ item: item.itemRef, score }));
}

function getIndexSize(basePath) {
  const entry = indices.get(basePath);
  return entry ? entry.data.length : 0;
}

module.exports = { fuzzySearch, getIndexSize, buildIndex };
