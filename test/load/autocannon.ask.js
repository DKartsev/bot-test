const autocannon = require('autocannon');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('../helpers/env');

const fixture = require('../__fixtures__/qa_pairs.fixture.json');
const dataFile = path.join(__dirname, '..', '..', 'data', 'qa_pairs.json');
fs.mkdirSync(path.dirname(dataFile), { recursive: true });
fs.writeFileSync(dataFile, JSON.stringify(fixture, null, 2));

const app = require('../../src/api');

const server = http.createServer(app);
server.listen(0, () => {
  const { port } = server.address();
  console.log('Running load test on port', port);
  const instance = autocannon({
    url: `http://localhost:${port}/ask`,
    method: 'POST',
    duration: 10,
    connections: 10,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Как пополнить баланс?' })
  });
  autocannon.track(instance);
  instance.on('done', () => server.close());
});
