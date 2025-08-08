const express = require('express');
const { getAnswer } = require('../support/support');

const app = express();
app.use(express.json());

app.post('/ask', (req, res) => {
  const { question } = req.body || {};
  const answer = getAnswer(question);
  if (typeof answer === 'string') {
    res.json({ answer, source: 'local' });
  } else {
    res.json({ answer: 'Извините, пока не знаю. Веду поиск…', source: 'none' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
