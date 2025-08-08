const Fuse = require('fuse.js');
const fuseConfig = require('./fuseConfig');
const store = require('../data/store');

let data = [];
let fuse = null;

function buildIndex() {
  data = store.getApproved().map((item) => {
    const searchTexts = [item.Question];
    if (item.translations) {
      for (const t of Object.values(item.translations)) {
        if (t && t.Question) searchTexts.push(t.Question);
      }
    }
    return { id: item.id, Question: item.Question, searchTexts, itemRef: item };
  });
  fuse = new Fuse(data, { ...fuseConfig, keys: ['Question', 'searchTexts'] });
}

buildIndex();

store.onUpdated(() => {
  buildIndex();
});

function fuzzySearch(query, limit = 5) {
  if (!query) return [];
  return fuse.search(query, { limit }).map(({ item, score }) => ({ item: item.itemRef, score }));
}

function getIndexSize() {
  return data.length;
}

module.exports = { fuzzySearch, getIndexSize };
