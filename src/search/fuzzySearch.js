const fs = require('fs');
const path = require('path');
const Fuse = require('fuse.js');
const fuseConfig = require('./fuseConfig');

const dataPath = path.join(__dirname, '..', '..', 'data', 'qa_pairs.json');
const qaPairs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const fuse = new Fuse(qaPairs, fuseConfig);

function fuzzySearch(query, limit = 5) {
  if (!query) {
    return [];
  }
  return fuse.search(query, { limit }).map(({ item, score }) => ({ item, score }));
}

module.exports = { fuzzySearch };
