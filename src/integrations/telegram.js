const { Telegraf } = require('telegraf');
const { logger } = require('../utils/logger');

function initTelegram() {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) throw new Error('TG_BOT_TOKEN missing');
  const bot = new Telegraf(token);

  async function handleUpdate(update) {
    try {
      await bot.handleUpdate(update);
    } catch (err) {
      logger.error({ err }, 'telegram handle update error');
    }
  }

  return { bot, handleUpdate };
}

module.exports = { initTelegram };
