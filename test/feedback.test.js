const request = require('supertest');
const { buildApp } = require('./helpers/testServer');

test('feedback flow', async () => {
  const app = buildApp();
  const askRes = await request(app)
    .post('/ask')
    .send({ question: 'Как пополнить баланс?' });
  const payload = {
    responseId: askRes.body.responseId,
    itemId: askRes.body.itemId,
    source: askRes.body.source,
    method: askRes.body.method,
    lang: askRes.body.lang,
    helpful: true
  };
  const fbRes = await request(app).post('/feedback').send(payload);
  expect(fbRes.status).toBe(200);
  expect(fbRes.body).toEqual({ ok: true });

  const recomputeRes = await request(app)
    .post('/admin/feedback/recompute')
    .set('Authorization', 'Bearer test-admin')
    .expect(200);
  expect(recomputeRes.body.items[askRes.body.itemId].pos).toBe(1);
});
