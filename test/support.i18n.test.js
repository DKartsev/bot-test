const { buildApp } = require('./helpers/testServer');

test('detect language from header', async () => {
  buildApp();
  const { getAnswer } = require('../src/support/support');
  const res = await getAnswer('How to top up balance?', {
    acceptLanguageHeader: 'en-US,en;q=0.9'
  });
  expect(res.lang).toBe('en');
  expect(res.answer).toBe('Use a card.');
});

test('render mustache variables', async () => {
  buildApp();
  const { getAnswer } = require('../src/support/support');
  const res = await getAnswer('Когда поступит перевод?', {
    vars: { amount: '100' }
  });
  expect(res.answer).toBe('Сумма 100 отправлена.');
});
