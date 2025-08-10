const express = require('express');
const { ingestLine } = require('../feedback/engine');
const metrics = require('../utils/metrics');
const { checkQuotas } = require('../tenancy/quotas');
const { addUsage } = require('../tenancy/orgStore');

const quotaErrors = {
  quota_requests: 'Monthly request quota exceeded',
  quota_tokens: 'Monthly OpenAI tokens quota exceeded',
  quota_rag: 'RAG storage quota exceeded',
  org_not_found: 'Organization not found'
};

const router = express.Router();

router.post('/', async (req, res) => {
  const {
    responseId,
    itemId,
    pendingId,
    source,
    method,
    lang,
    helpful,
    comment,
    tags
  } = req.body || {};
  const maxComment = parseInt(process.env.FEEDBACK_MAX_COMMENT || '500', 10);
  if (!responseId || !source || !method || helpful === undefined) {
    req.log.warn({ body: req.body }, 'invalid feedback');
    return res.status(400).json({ error: 'Invalid payload' });
  }
  let helpfulRaw = helpful;
  if (typeof helpful !== 'boolean' && typeof helpful !== 'number') {
    return res.status(400).json({ error: 'Invalid helpful value' });
  }
  const trimmedComment =
    typeof comment === 'string' ? comment.trim().slice(0, maxComment) : undefined;
  const normalizedTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : undefined;
  const quota = checkQuotas({ type: 'request', cost: 1 }, req);
  if (!quota.ok) {
    return res.status(429).json({ error: quotaErrors[quota.reason] || 'Quota exceeded' });
  }
  const lineObj = {
    ts: new Date().toISOString(),
    responseId,
    itemId,
    pendingId,
    source,
    method,
    lang,
    helpfulRaw,
    tags: normalizedTags,
    comment: trimmedComment
  };
  try {
    const classified = await ingestLine(lineObj);
    metrics.recordFeedback(classified);
    addUsage(req.tenant.orgId, { requestsMonth: 1 });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, 'Failed to handle feedback');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
