const fs = require('fs');
const path = require('path');
require('./helpers/env');

const fixture = require('./__fixtures__/qa_pairs.fixture.json');
const dataPath = path.join(__dirname, '..', 'data', 'qa_pairs.json');
fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.writeFileSync(dataPath, JSON.stringify(fixture, null, 2));

const { fuzzySearch, getIndexSize } = require('../src/search/fuzzySearch');

test('misspelled question finds correct item', () => {
  const [res] = fuzzySearch('Как пополнить балнс?');
  expect(res.item.Answer).toBe('Используйте карту.');
  expect(res.score).toBeLessThan(0.4);
});

test('index size equals approved items', () => {
  expect(getIndexSize()).toBe(fixture.length);
});
