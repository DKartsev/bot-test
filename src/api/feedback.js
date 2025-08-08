const express = require('express');
const { ingestLine } = require('../feedback/engine');
const metrics = require('../utils/metrics');

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
  let positive = false;
  let negative = false;
  let neutral = false;
  let helpfulRaw = helpful;
  if (typeof helpful === 'boolean') {
    positive = helpful === true;
    negative = helpful === false;
  } else if (typeof helpful === 'number') {
    if (helpful >= 4) positive = true;
    else if (helpful <= 2) negative = true;
    else neutral = true;
  } else {
    return res.status(400).json({ error: 'Invalid helpful value' });
  }
  if (!positive && !negative) neutral = true;
  const trimmedComment =
    typeof comment === 'string' ? comment.trim().slice(0, maxComment) : undefined;
  const normalizedTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : undefined;
  const lineObj = {
    ts: new Date().toISOString(),
    responseId,
    itemId,
    pendingId,
    source,
    method,
    lang,
    helpfulRaw,
    positive,
    negative,
    neutral,
    tags: normalizedTags,
    comment: trimmedComment
  };
  try {
    await ingestLine(lineObj);
    metrics.recordFeedback({ positive, negative, neutral, lang, source });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, 'Failed to handle feedback');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
