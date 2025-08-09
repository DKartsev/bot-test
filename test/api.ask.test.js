const request = require('supertest');
const { buildApp } = require('./helpers/testServer');

test('ask endpoint returns answer', async () => {
  const app = buildApp();
  const res = await request(app).post('/ask').send({ question: 'Как пополнить баланс?' });
  expect(res.status).toBe(200);
  expect(res.body.answer).toBe('Используйте карту.');
  expect(res.body.source).toBe('local');
  expect(res.body.method).toBeDefined();
  expect(res.body.responseId).toBeDefined();
  expect(res.body.itemId).toBeDefined();
});

test('i18n translation', async () => {
  const app = buildApp();
  const res = await request(app)
    .post('/ask')
    .send({ question: 'How to top up balance?', lang: 'en' });
  expect(res.status).toBe(200);
  expect(res.body.answer).toBe('Use a card.');
  expect(res.body.lang).toBe('en');
});

test('need variables when missing', async () => {
  const app = buildApp();
  const res = await request(app).post('/ask').send({ question: 'Когда поступит перевод?' });
  expect(res.status).toBe(200);
  expect(res.body.needVars).toEqual(['amount']);
});
