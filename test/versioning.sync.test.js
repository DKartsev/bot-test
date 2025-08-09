const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { buildApp } = require('./helpers/testServer');

test('creates snapshot on CRUD mutation', async () => {
  const app = buildApp();
  const newItem = {
    Question: 'Новый вопрос?',
    Answer: 'Новый ответ.'
  };
  await request(app)
    .post('/admin/qa')
    .set('Authorization', 'Bearer test-admin')
    .send(newItem)
    .expect(200);
  await new Promise((r) => setTimeout(r, 200));
  const versionsDir = path.join(__dirname, '..', 'data', 'versions');
  const files = fs.readdirSync(versionsDir).filter((f) => f.endsWith('.json'));
  expect(files.length).toBeGreaterThan(0);
  const res = await request(app)
    .get('/admin/versions')
    .set('Authorization', 'Bearer test-admin')
    .expect(200);
  expect(res.body.snapshots.length).toBeGreaterThan(0);
});
