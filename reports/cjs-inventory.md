# CommonJS Inventory

## require() usages

```
src/live/bus.js:1:const EventEmitter = require('events');
src/api/server.js:1:require('dotenv').config();
src/api/server.js:2:const { logger } = require('../utils/logger');
src/api/server.js:3:const app = require('./index');
src/api/versions.js:1:const express = require('express');
src/api/versions.js:9:} = require('../versioning/engine');
src/api/versions.js:10:const { authMiddleware, auditLog } = require('../utils/security');
src/api/orgs.js:1:const express = require('express');
src/api/orgs.js:2:const orgStore = require('../tenancy/orgStore');
src/api/orgs.js:3:const { auditLog } = require('../utils/security');
src/feedback/engine.js:1:const fs = require('fs');
src/feedback/engine.js:2:const path = require('path');
src/feedback/engine.js:3:const readline = require('readline');
src/feedback/engine.js:5:const { logger } = require('../utils/logger');
src/feedback/engine.js:9:    const { createStore } = require('../data/store');
src/feedback/engine.js:38:      const OpenAI = require('openai');
src/api/webhooks.js:1:const express = require('express');
src/api/webhooks.js:2:const rateLimit = require('express-rate-limit');
src/api/webhooks.js:3:const { logger } = require('../utils/logger');
src/api/webhooks.js:4:const { auditLog, hashToken } = require('../utils/security');
src/api/webhooks.js:5:const ipRangeCheck = require('ip-range-check');
src/api/webhooks.js:23:    const { initTelegram } = require('../integrations/telegram');
src/api/admin-security.js:1:const express = require('express');
src/api/admin-security.js:2:const fs = require('fs');
src/api/admin-security.js:3:const path = require('path');
src/api/admin-security.js:4:const dlp = require('../security/dlp');
src/api/admin-security.js:5:const { ipAllowlistMiddleware, rateLimiter, authMiddleware, auditLog } = require('../utils/security');
src/api/index.js:1:const express = require('express');
src/api/index.js:2:const helmet = require('helmet');
src/api/index.js:3:const cors = require('cors');
src/api/index.js:4:const crypto = require('crypto');
src/api/index.js:5:const orgStore = require('../tenancy/orgStore');
src/api/index.js:7:const { getAnswer } = require('../support/support');
src/api/index.js:8:const { logger, withRequest } = require('../utils/logger');
src/api/index.js:9:const metrics = require('../utils/metrics');
src/api/index.js:10:const { tenantCtx, withTenantLogger } = require('../tenancy/tenantCtx');
src/api/index.js:11:const { tenantRateLimiter, checkQuotas } = require('../tenancy/quotas');
src/api/index.js:12:const { initObservabilityHooks, renderPromMetrics } = require('../utils/observability');
src/api/index.js:13:const { startAlertScheduler } = require('../alerts/engine');
src/api/index.js:14:const adminRouter = require('./admin');
src/api/index.js:15:const feedbackRouter = require('./feedback');
src/api/index.js:16:const webhooksRouter = require('./webhooks');
src/api/index.js:17:const { ipAllowlistMiddleware, rateLimiter, authMiddleware } = require('../utils/security');
src/api/index.js:18:const { startScheduler } = require('../sync/engine');
src/api/index.js:19:const { createStore } = require('../data/store');
src/api/index.js:21:const { initVersioning } = require('../versioning/engine');
src/api/index.js:22:const { startFeedbackAggregator } = require('../feedback/engine');
src/api/index.js:23:const { initSemantic } = require('../semantic/index');
src/api/index.js:24:const { initRagIndex } = require('../rag/index');
src/api/index.js:25:const { embed, initEmbedder } = require('../semantic/embedder');
src/api/index.js:26:const dlp = require('../security/dlp');
src/api/index.js:27:const adminSecurityRouter = require('./admin-security');
src/api/index.js:28:const orgsRouter = require('./orgs');
src/search/fuzzySearch.js:1:const Fuse = require('fuse.js');
src/search/fuzzySearch.js:2:const fuseConfig = require('./fuseConfig');
src/search/fuzzySearch.js:3:const { createStore } = require('../data/store');
src/api/feedback.js:1:const express = require('express');
src/api/feedback.js:2:const { ingestLine } = require('../feedback/engine');
src/api/feedback.js:3:const metrics = require('../utils/metrics');
src/api/feedback.js:4:const { checkQuotas } = require('../tenancy/quotas');
src/api/feedback.js:5:const { addUsage } = require('../tenancy/orgStore');
src/api/admin.js:1:const express = require('express');
src/api/admin.js:2:const Ajv = require('ajv');
src/api/admin.js:3:const addFormats = require('ajv-formats');
src/api/admin.js:4:const fs = require('fs');
src/api/admin.js:5:const path = require('path');
src/api/admin.js:6:const { logger } = require('../utils/logger');
src/api/admin.js:7:const { createStore } = require('../data/store');
src/api/admin.js:9:const { tenantCtx } = require('../tenancy/tenantCtx');
src/api/admin.js:10:const { authMiddleware, auditLog } = require('../utils/security');
src/api/admin.js:11:const { liveBus } = require('../live/bus');
src/api/admin.js:12:const { runSync, getStatus, getLastDiff } = require('../sync/engine');
src/api/admin.js:13:const { recomputeAll, getSnapshot, suggestActions, applyAutoActions } = require('../feedback/engine');
src/api/admin.js:14:const versionsRouter = require('./versions');
src/api/admin.js:15:const { rebuildAll: rebuildSemantic, status: semanticStatus } = require('../semantic/index');
src/api/admin.js:16:const multer = require('multer');
src/api/admin.js:20:} = require('../rag/ingest');
src/api/admin.js:27:} = require('../rag/index');
src/api/admin.js:28:const { checkQuotas } = require('../tenancy/quotas');
src/api/admin.js:29:const { addUsage } = require('../tenancy/orgStore');
src/i18n/renderer.js:1:const mustache = require('mustache');
src/i18n/detect.js:1:const parser = require('accept-language-parser');
src/semantic/embedder.js:1:const fs = require('fs');
src/semantic/embedder.js:2:const path = require('path');
src/semantic/embedder.js:3:const crypto = require('crypto');
src/semantic/embedder.js:4:const { logger } = require('../utils/logger');
src/semantic/embedder.js:68:      const { pipeline } = require('@xenova/transformers');
src/semantic/embedder.js:77:      const OpenAI = require('openai');
src/semantic/index.js:1:const fs = require('fs');
src/semantic/index.js:2:const path = require('path');
src/semantic/index.js:6:  ({ HierarchicalNSW } = require('hnswlib-node'));
src/semantic/index.js:10:const { embed, initEmbedder } = require('./embedder');
src/semantic/index.js:11:const { logger } = require('../utils/logger');
src/semantic/index.js:25:const { createStore } = require('../data/store');
src/sync/engine.js:1:const fs = require('fs');
src/sync/engine.js:2:const path = require('path');
src/sync/engine.js:3:const cron = require('node-cron');
src/sync/engine.js:4:const deepEqual = require('fast-deep-equal');
src/sync/engine.js:5:const { createStore } = require('../data/store');
src/sync/engine.js:7:const { logger } = require('../utils/logger');
src/sync/engine.js:8:const { toLocalItem, toProviderRow } = require('./map');
src/sync/engine.js:20:  if (provider === 'airtable') return require('./provider/airtable');
src/sync/engine.js:21:  return require('./provider/googleSheets');
src/monitoring/healthCheck.ts:43:        loadAverage: require('os').loadavg(),
src/monitoring/healthCheck.ts:74:      const { promises: fs } = require('fs');
src/sync/provider/googleSheets.js:1:const { google } = require('googleapis');
src/sync/provider/airtable.js:1:const Airtable = require('airtable');
src/sync/map.js:1:const { v4: uuidv4 } = require('uuid');
src/llm/fallback.js:1:const OpenAI = require('openai');
src/llm/fallback.js:2:const dotenv = require('dotenv');
src/llm/fallback.js:3:const { logger } = require('../utils/logger');
src/tenancy/tenantCtx.js:1:const orgStore = require('./orgStore');
src/tenancy/quotas.js:1:const rateLimit = require('express-rate-limit');
src/tenancy/quotas.js:2:const orgStore = require('./orgStore');
src/tenancy/quotas.js:3:const fs = require('fs');
src/tenancy/quotas.js:4:const path = require('path');
src/tenancy/orgStore.js:1:const fs = require('fs');
src/tenancy/orgStore.js:2:const path = require('path');
src/tenancy/orgStore.js:3:const crypto = require('crypto');
src/support/support.js:1:const crypto = require('crypto');
src/support/support.js:2:const { v4: uuidv4 } = require('uuid');
src/support/support.js:3:const { semanticSearch } = require('../search/semanticSearch');
src/support/support.js:4:const { fallbackQuery } = require('../llm/fallback');
src/support/support.js:5:const { logger } = require('../utils/logger');
src/support/support.js:6:const { createStore } = require('../data/store');
src/support/support.js:7:const metrics = require('../utils/metrics');
src/support/support.js:8:const { detectLang } = require('../i18n/detect');
src/support/support.js:14:} = require('../i18n/renderer');
src/support/support.js:15:const { liveBus } = require('../live/bus');
src/support/support.js:16:const { retrieve } = require('../rag/retriever');
src/support/support.js:17:const { answerWithRag } = require('../rag/answerer');
src/support/support.js:18:const dlp = require('../security/dlp');
src/support/support.js:25:  ({ searchSemantic } = require('../semantic/index'));
src/support/support.js:26:  ({ hybridRank, MIN_SIM } = require('../semantic/rerank'));
src/security/dlp.js:1:const fs = require('fs');
src/security/dlp.js:2:const path = require('path');
src/security/dlp.js:3:const yaml = require('yaml');
src/security/dlp.js:4:const crypto = require('crypto');
src/security/dlp.js:5:const { detectAll } = require('./patterns');
src/security/dlp.js:6:const { redact } = require('./redactor');
src/security/dlp.js:7:const metrics = require('../utils/metrics');
src/rag/ingest.js:1:const fs = require('fs');
src/rag/ingest.js:2:const path = require('path');
src/rag/ingest.js:3:const crypto = require('crypto');
src/rag/ingest.js:4:const pdfParse = require('pdf-parse');
src/rag/ingest.js:5:const { JSDOM } = require('jsdom');
src/rag/ingest.js:6:const Turndown = require('turndown');
src/rag/ingest.js:7:const { randomUUID } = require('crypto');
src/rag/ingest.js:8:const { chunkText } = require('./chunker');
src/rag/ingest.js:9:const { logger } = require('../utils/logger');
src/rag/ingest.js:10:const dlp = require('../security/dlp');
src/security/patterns.js:1:const crypto = require('crypto');
src/rag/chunker.js:1:const { randomUUID } = require('crypto');
src/integrations/telegram.js:1:const { Telegraf } = require('telegraf');
src/integrations/telegram.js:2:const { logger } = require('../utils/logger');
src/security/redactor.js:1:const { maskEmail, maskPhone } = require('./patterns');
src/rag/retriever.js:1:const { searchChunks } = require('./index');
src/rag/index.js:1:const fs = require('fs');
src/rag/index.js:2:const path = require('path');
src/rag/index.js:3:const { HierarchicalNSW } = require('hnswlib-node');
src/rag/index.js:4:const { logger } = require('../utils/logger');
src/rag/answerer.js:1:const OpenAI = require('openai');
src/rag/answerer.js:2:const { logger } = require('../utils/logger');
src/data/store.js:1:const fs = require('fs');
src/data/store.js:2:const path = require('path');
src/data/store.js:3:const { EventEmitter } = require('events');
src/data/store.js:4:const { v4: uuidv4 } = require('uuid');
src/data/store.js:5:const Ajv = require('ajv');
src/data/store.js:6:const addFormats = require('ajv-formats');
src/utils/logger.js:1:const fs = require('fs');
src/utils/logger.js:2:const path = require('path');
src/utils/logger.js:3:const pino = require('pino');
src/utils/logger.js:4:const rfs = require('rotating-file-stream');
src/utils/logger.js:38:    const { createWriteStream } = require('pino-loki');
src/utils/logger.js:63:    const pinoElastic = require('pino-elasticsearch');
src/alerts/engine.js:1:const os = require('os');
src/alerts/engine.js:2:const { logger } = require('../utils/logger');
src/bot/commands.ts:7:const { answerWithRag } = require('../rag/answerer.js');
src/bot/commands.ts:8:const { retrieve } = require('../rag/retriever.js');
src/utils/metrics.js:1:const fs = require('fs');
src/utils/metrics.js:2:const path = require('path');
src/utils/metrics.js:3:const { createStore } = require('../data/store');
src/utils/observability.js:1:const client = require('prom-client');
src/utils/security.js:1:const crypto = require('crypto');
src/utils/security.js:2:const fs = require('fs');
src/utils/security.js:3:const path = require('path');
src/utils/security.js:4:const ipaddr = require('ipaddr.js');
src/utils/security.js:5:const rateLimit = require('express-rate-limit');
src/versioning/engine.js:1:const fs = require('fs');
src/versioning/engine.js:2:const path = require('path');
src/versioning/engine.js:3:const { diffDatasets } = require('./diff');
src/versioning/diff.js:1:const { diffWords } = require('diff');
src/versioning/diff.js:2:const deepEqual = require('fast-deep-equal');
```

## module.exports / exports = usages

```
src/api/versions.js:84:module.exports = router;
src/api/orgs.js:79:module.exports = router;
src/api/webhooks.js:60:module.exports = router;
src/api/admin-security.js:49:module.exports = router;
src/api/index.js:231:module.exports = app;
src/api/feedback.js:69:module.exports = router;
src/api/admin.js:627:module.exports = router;
src/i18n/renderer.js:46:module.exports = {
src/i18n/detect.js:16:module.exports = { detectLang };
src/sync/engine.js:239:module.exports = { runSync, startScheduler, getStatus, getLastDiff };
src/data/store.js:420:module.exports = { createStore };
src/alerts/engine.js:79:module.exports = { startAlertScheduler, sendAlert, getAlertStatus };
src/sync/provider/googleSheets.js:101:module.exports = { fetchAll, pushChanges };
src/sync/provider/airtable.js:61:module.exports = { fetchAll, pushChanges };
src/rag/ingest.js:137:module.exports = { ingestFile, ingestText };
src/live/bus.js:10:module.exports = { liveBus };
src/sync/map.js:54:module.exports = {
src/rag/chunker.js:44:module.exports = { chunkText };
src/rag/retriever.js:46:module.exports = { retrieve, formatCitations };
src/feedback/engine.js:230:module.exports = {
src/tenancy/tenantCtx.js:37:module.exports = { tenantCtx, withTenantLogger };
src/rag/index.js:237:module.exports = { initRagIndex, upsertChunks, removeSource, searchChunks, status, rebuildAll };
src/tenancy/quotas.js:84:module.exports = { tenantRateLimiter, checkQuotas, resetMonthlyIfNeeded };
src/rag/answerer.js:45:module.exports = { answerWithRag };
src/tenancy/orgStore.js:218:module.exports = {
src/search/fuzzySearch.js:41:module.exports = { fuzzySearch, getIndexSize, buildIndex };
src/search/fuseConfig.js:1:module.exports = {
src/versioning/engine.js:217:module.exports = {
src/versioning/diff.js:66:module.exports = { diffText, diffItem, diffDatasets };
src/security/dlp.js:127:module.exports = { loadPolicies, scanIn, sanitizeOut, getPolicyMeta, getStats };
src/security/patterns.js:88:module.exports = {
src/security/redactor.js:37:module.exports = { redact };
src/semantic/embedder.js:139:module.exports = { initEmbedder, embed };
src/semantic/index.js:230:module.exports = { initSemantic, searchSemantic, rebuildAll, status };
src/semantic/rerank.js:33:module.exports = { hybridRank, MIN_SIM };
src/llm/fallback.js:45:module.exports = { fallbackQuery };
src/integrations/telegram.js:20:module.exports = { initTelegram };
src/support/support.js:304:module.exports = { getAnswer };
src/utils/logger.js:102:module.exports = { logger, withRequest, withTenant };
src/utils/security.js:123:module.exports = {
src/utils/observability.js:74:module.exports = {
src/utils/metrics.js:198:module.exports = {
```

## \_\_dirname usages

```
src/feedback/engine.js:16:  path.join(__dirname, '..', '..', 'logs', 'feedback.jsonl');
src/feedback/engine.js:18:  path.join(__dirname, '..', '..', 'feedback', 'metrics.json');
src/feedback/engine.js:187:  const modLog = path.join(__dirname, '..', '..', 'logs', 'moderation.jsonl');
src/api/admin-security.js:14:  const file = fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'security', 'policies.yaml'), 'utf8');
src/api/admin-security.js:27:  const file = path.join(__dirname, '..', '..', 'logs', 'dlp.jsonl');
src/security/dlp.js:9:const POL_PATH = path.join(__dirname, '..', '..', 'data', 'security', 'policies.yaml');
src/security/dlp.js:10:const LOG_PATH = path.join(__dirname, '..', '..', 'logs', 'dlp.jsonl');
src/server/app.ts:84:app.use('/admin', express.static(path.join(__dirname, '../admin-out')));
src/server/app.ts:87:  res.sendFile(path.join(__dirname, '../admin-out/index.html'))
src/api/admin.js:43:const upload = multer({ dest: path.join(__dirname, '..', '..', 'data', 'tmp') });
src/api/admin.js:129:  const dir = path.join(__dirname, '..', '..', 'logs');
src/api/admin.js:566:    const base = process.env.RAG_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'tenants');
src/semantic/embedder.js:11:const indexPath = process.env.SEM_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'semantic');
src/semantic/index.js:28:const DATA_BASE = process.env.SEM_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'tenants');
src/utils/logger.js:6:const logDir = path.join(__dirname, '..', '..', 'logs');
src/sync/engine.js:114:  const logDir = path.join(__dirname, '..', '..', 'logs');
src/utils/security.js:8:  fs.mkdirSync(path.join(__dirname, '..', '..', 'logs'), { recursive: true });
src/utils/security.js:82:  fs.appendFileSync(path.join(__dirname, '..', '..', 'logs', 'audit.jsonl'), line + '\n');
src/utils/metrics.js:93:  const dir = path.join(__dirname, '..', '..', 'logs');
src/data/store.js:9:  __dirname,
src/tenancy/quotas.js:11:const usageFile = path.join(__dirname, '../../data/usage.json');
src/tenancy/orgStore.js:12:const tenantsDir = path.join(__dirname, '../../data/tenants');
src/tenancy/orgStore.js:75:  const legacy = path.join(__dirname, '../../data/qa_pairs.json');
src/rag/ingest.js:12:const DATA_DIR = process.env.RAG_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'rag');
src/versioning/engine.js:5:const dataDir = path.join(__dirname, '..', '..', 'data');
src/versioning/engine.js:7:const logsDir = path.join(__dirname, '..', '..', 'logs');
src/rag/index.js:6:const DATA_BASE = process.env.RAG_INDEX_PATH || path.join(__dirname, '..', '..', 'data', 'tenants');
```

## \_\_filename usages

```

```

## Duplicate utilities

- `answerWithRag` in `src/rag/answerer.js` and `getAnswer` in `src/support/support.js` overlap in answering logic.
- Retrieval helpers (`src/rag/retriever.js`) are coupled to support functions.
- Logging utilities are scattered between `src/support/support.js` and `src/utils/logger.js`.
- Tenant management (`src/tenancy/orgStore.js`, `src/tenancy/tenantCtx.js`, `src/tenancy/quotas.js`) duplicate configuration parsing and access patterns.
