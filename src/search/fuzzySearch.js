const Fuse = require('fuse.js');
const fuseConfig = require('./fuseConfig');
const store = require('../data/store');

let data = store.getAll();
let fuse = new Fuse(data, fuseConfig);

store.onUpdated(() => {
  data = store.getAll();
  fuse = new Fuse(data, fuseConfig);
});

function fuzzySearch(query, limit = 5) {
  if (!query) return [];
  return fuse.search(query, { limit }).map(({ item, score }) => ({ item, score }));
}

function getIndexSize() {
  return data.length;
}

module.exports = { fuzzySearch, getIndexSize };
