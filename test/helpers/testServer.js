const fs = require('fs');
const path = require('path');
const { resetTempDirs } = require('./env');

function buildApp() {
  if (global.jest) {
    jest.resetModules();
  }
  resetTempDirs();
  const fixture = path.join(__dirname, '..', '__fixtures__', 'qa_pairs.fixture.json');
  const dataFile = path.join(__dirname, '..', '..', 'data', 'qa_pairs.json');
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.copyFileSync(fixture, dataFile);
  const app = require('../../src/api');
  return app;
}

module.exports = { buildApp };
