const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const orgStore = require('../tenancy/orgStore');
orgStore.init();
const { getAnswer } = require('../support/support');
const { logger, withRequest } = require('../utils/logger');
const metrics = require('../utils/metrics');
const { tenantCtx, withTenantLogger } = require('../tenancy/tenantCtx');
const { tenantRateLimiter, checkQuotas } = require('../tenancy/quotas');
const { initObservabilityHooks, renderPromMetrics } = require('../utils/observability');
const { startAlertScheduler } = require('../alerts/engine');
const adminRouter = require('./admin');
const feedbackRouter = require('./feedback');
const webhooksRouter = require('./webhooks');
const { initMatrix } = require('../integrations/matrix');
const { ipAllowlistMiddleware, rateLimiter, authMiddleware } = require('../utils/security');
const { startScheduler } = require('../sync/engine');
const { createStore } = require('../data/store');
const store = createStore();
const { initVersioning } = require('../versioning/engine');
const { startFeedbackAggregator } = require('../feedback/engine');
const { initSemantic } = require('../semantic/index');
const { initRagIndex } = require('../rag/index');
const { embed, initEmbedder } = require('../semantic/embedder');
const dlp = require('../security/dlp');
const adminSecurityRouter = require('./admin-security');
const orgsRouter = require('./orgs');

const quotaErrors = {
  quota_requests: 'Monthly request quota exceeded',
  quota_tokens: 'Monthly OpenAI tokens quota exceeded',
  quota_rag: 'RAG storage quota exceeded',
  org_not_found: 'Organization not found'
};

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

app.get('/healthz', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.options('/admin/*', adminCors, ipAllowlistMiddleware(), rateLimiter(), (req, res) => {
  res.sendStatus(204);
});
app.use('/admin', adminCors, ipAllowlistMiddleware(), rateLimiter(), adminRouter);
app.use(
  '/admin/orgs',
  adminCors,
  ipAllowlistMiddleware(),
  rateLimiter(),
  authMiddleware(['admin']),
  tenantCtx(),
  orgsRouter
);
app.use('/admin/security', adminCors, adminSecurityRouter);
app.use('/feedback', cors(), tenantCtx(), tenantRateLimiter(), feedbackRouter);
app.use(webhooksRouter);

dlp.loadPolicies();

app.post('/ask', cors(), tenantCtx(), tenantRateLimiter(), async (req, res) => {
  const { question, lang, vars } = req.body || {};
  const acceptLanguageHeader = req.headers['accept-language'];
  req.log = withTenantLogger(req, req.log);
  const log = req.log;
  log.info({ question, lang }, 'incoming question');
  const quota = checkQuotas({ type: 'request', cost: 1 }, req);
  if (!quota.ok) {
    return res.status(429).json({ error: quotaErrors[quota.reason] || 'Quota exceeded' });
  }
  const scan = dlp.scanIn({ text: question || '', route: '/ask' });
  if (scan.blocked) {
    return res
      .status(400)
      .json({ error: 'Похоже, в запросе есть чувствительные данные. Удалите или замаскируйте их и попробуйте снова.' });
  }
  try {
    let result = await getAnswer(question, { lang, vars, acceptLanguageHeader, tenant: req.tenant });
    const out = dlp.sanitizeOut({ text: result.answer || '', route: '/ask' });
    if (out.blocked) {
      result.answer = `Я не могу отправить потенциально секретные данные. Вот безопасная версия: ${out.text}`;
      result.source = 'blocked';
      result.method = 'dlp';
    } else {
      result.answer = out.text;
    }
    const durationMs = Date.now() - req.start;
    metrics.recordRequest(durationMs, result.source, result.lang, req.tenant);
    orgStore.addUsage(req.tenant.orgId, { requestsMonth: 1 });
    if (result.source === 'openai') {
      metrics.recordNoMatch(question);
      if (result.pendingId) {
        metrics.recordOpenaiCached();
      }
      log.info({
        source: result.source,
        method: result.method,
        durationMs,
        pendingId: result.pendingId,
        lang: result.lang
      });
    } else {
      log.info({
        source: result.source,
        method: result.method,
        rankMethod: result.rankMethod,
        matchedQuestion: result.matchedQuestion,
        score: result.score,
        semSim: result.semSim,
        combinedScore: result.combinedScore,
        durationMs,
        lang: result.lang,
        variablesUsed: result.variablesUsed,
        needVars: result.needVars
      });
    }
    res.json({
      responseId: result.responseId,
      answer: result.answer,
      source: result.source,
      method: result.method,
      matchedQuestion: result.matchedQuestion,
      score: result.score,
      itemId: result.itemId,
      pendingId: result.pendingId,
      durationMs,
      lang: result.lang,
      variablesUsed: result.variablesUsed,
      needVars: result.needVars,
      semSim: result.semSim,
      combinedScore: result.combinedScore,
      rankMethod: result.rankMethod
    });
  } catch (error) {
    metrics.recordError('ask');
    req.log.error({ err: error }, 'Error handling /ask');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/metrics', (req, res) => {
  res.json(metrics.snapshot());
});

if (process.env.PROM_ENABLED !== '0') {
  const promPath = process.env.PROM_METRICS_PATH || '/metrics/prom';
  app.get(promPath, async (req, res) => {
    try {
      const body = await renderPromMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(body);
    } catch (err) {
      metrics.recordError('metrics_prom');
      (req.log || logger).error({ err }, 'Error rendering prom metrics');
      res.status(500).end();
    }
  });
}

app.use((err, req, res, next) => {
  metrics.recordError('unhandled');
  (req.log || logger).error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

initVersioning(store);
startScheduler();
startFeedbackAggregator(store);
initObservabilityHooks(metrics, store);
startAlertScheduler(store, metrics);

if (process.env.SEM_ENABLED === '1') {
  (async () => {
    try {
      const info = await initSemantic({ tenantId: orgStore.TENANT_DEFAULT_ID, projectId: 'root' });
      logger.info(
        {
          provider: info.provider,
          size: info.size,
          dim: info.dim
        },
        'Semantic index initialized'
      );
    } catch (err) {
      logger.error({ err }, 'Failed to initialize semantic index');
    }
  })();
}

if (process.env.RAG_ENABLED === '1') {
  (async () => {
    try {
      await initEmbedder();
      const info = await initRagIndex({ embed, tenantId: orgStore.TENANT_DEFAULT_ID, projectId: 'root' });
      logger.info({ size: info.size, dim: info.dim }, 'RAG index initialized');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize RAG index');
    }
  })();
}

if (process.env.MATRIX_ENABLED === '1') {
  (async () => {
    try {
      const matrix = initMatrix();
      await matrix.start();
    } catch (err) {
      logger.error({ err }, 'Failed to start Matrix bot');
    }
  })();
}

module.exports = app;
