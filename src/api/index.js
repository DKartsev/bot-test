require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const { getAnswer } = require('../support/support');
const { logger, withRequest } = require('../utils/logger');
const metrics = require('../utils/metrics');
const adminRouter = require('./admin');
const { ipAllowlistMiddleware, rateLimiter } = require('../utils/security');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const adminOrigins = (process.env.ADMIN_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const adminCors = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (adminOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 204
});

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.start = Date.now();
  req.log = withRequest(req);
  next();
});

app.options('/admin/*', adminCors, ipAllowlistMiddleware(), rateLimiter(), (req, res) => {
  res.sendStatus(204);
});
app.use('/admin', adminCors, ipAllowlistMiddleware(), rateLimiter(), adminRouter);

app.post('/ask', cors(), async (req, res) => {
  const { question } = req.body || {};
  const log = req.log;
  log.info({ question }, 'incoming question');
  try {
    const result = await getAnswer(question);
    const durationMs = Date.now() - req.start;
    metrics.recordRequest(durationMs, result.source);
    if (result.source === 'openai') {
      metrics.recordNoMatch(question);
      if (result.pendingId) {
        metrics.recordOpenaiCached();
      }
      log.info({ source: result.source, method: result.method, durationMs, pendingId: result.pendingId });
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
      pendingId: result.pendingId,
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

app.use((err, req, res, next) => {
  (req.log || logger).error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

module.exports = app;
