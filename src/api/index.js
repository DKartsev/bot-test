const express = require('express');
const crypto = require('crypto');
const { getAnswer } = require('../support/support');
const { logger, withRequest } = require('../utils/logger');
const metrics = require('../utils/metrics');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.start = Date.now();
  req.log = withRequest(req);
  next();
});

app.post('/ask', async (req, res) => {
  const { question } = req.body || {};
  const log = req.log;
  log.info({ question }, 'incoming question');
  try {
    const result = await getAnswer(question);
    const durationMs = Date.now() - req.start;
    metrics.recordRequest(durationMs, result.source);
    if (result.source === 'openai') {
      metrics.recordNoMatch(question);
      log.info({ source: result.source, method: result.method, durationMs });
    } else {
      log.info({
        source: result.source,
        method: result.method,
        matchedQuestion: result.matchedQuestion,
        score: result.score,
        durationMs
      });
    }
    res.json({
      answer: result.answer,
      source: result.source,
      method: result.method,
      matchedQuestion: result.matchedQuestion,
      score: result.score,
      durationMs
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error handling /ask');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/metrics', (req, res) => {
  res.json(metrics.snapshot());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

module.exports = app;
