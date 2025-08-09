const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

if (process.env.TELEGRAM_ENABLED === '1') {
  try {
    const { initTelegram } = require('../integrations/telegram');
    const tg = initTelegram();
    const path = process.env.TG_WEBHOOK_PATH || '/webhooks/telegram';
    router.post(path, async (req, res) => {
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
