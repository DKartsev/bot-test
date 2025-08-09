const express = require('express');
const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');
const { auditLog, hashToken } = require('../utils/security');
const ipRangeCheck = require('ip-range-check');

const ALLOWED_IPS = [
  '149.154.160.0/20', // Telegram
  '91.108.4.0/22', // Telegram
  '10.0.0.0/8', // Render внутренние адреса
  '193.233.115.178' // Твой IP
];

function isAllowedIP(ip) {
  const realIP = (ip || '').replace('::ffff:', '');
  return ipRangeCheck(realIP, ALLOWED_IPS);
}

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
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      if (!isAllowedIP(clientIP)) {
        console.warn(`Unauthorized Telegram webhook access from ${clientIP}`);
        return res.sendStatus(403);
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
