const express = require('express');
const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');
const { auditLog, hashToken } = require('../utils/security');

const router = express.Router();

if (process.env.TELEGRAM_ENABLED === '1') {
  try {
    const { initTelegram } = require('../integrations/telegram');
    const tg = initTelegram();
    const path = process.env.TG_WEBHOOK_PATH || '/webhooks/telegram';
    const limiter = rateLimit({
      windowMs: parseInt(process.env.TG_WEBHOOK_RATE_WINDOW_MS || '60000', 10),
      max: parseInt(process.env.TG_WEBHOOK_RATE_MAX || '100', 10),
      standardHeaders: true,
      legacyHeaders: false
    });
    router.post(path, limiter, async (req, res) => {
      const token = req.get('X-Telegram-Bot-Api-Secret-Token');
      const expected = process.env.TG_WEBHOOK_SECRET;
      if (!expected || token !== expected) {
        auditLog(req, {
          action: 'tg.webhook',
          ok: false,
          details: { reason: 'invalid_token', tokenHash: token ? hashToken(token) : null }
        });
        return res.sendStatus(401);
      }
      try {
        await tg.handleUpdate(req.body);
      } catch (err) {
        logger.error({ err }, 'Telegram webhook error');
      }
      res.sendStatus(200);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to init Telegram integration');
  }
}

module.exports = router;
