const express = require('express');
const { getAnswer } = require('../support/support');
const logger = require('../utils/logger');

const app = express();
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { question } = req.body || {};
  try {
    const { answer, source } = await getAnswer(question);
    res.json({ answer, source });
  } catch (error) {
    logger.error('Error handling /ask', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.log(`Server listening on port ${PORT}`);
});

module.exports = app;
