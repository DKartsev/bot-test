import { Telegraf } from 'telegraf';
import logger from './utils/logger';
import textHandler from './handlers/textHandler';
import mediaHandler from './handlers/mediaHandler';
import { TG_BOT_TOKEN } from './config/env';

let bot: Telegraf;

try {
  bot = new Telegraf(TG_BOT_TOKEN);
  bot.on('text', textHandler);
  bot.on(['photo', 'video', 'voice', 'audio'], mediaHandler);
  logger.info('Bot initialized');
} catch (err) {
  logger.error({ err }, 'Failed to initialize bot');
  throw err;
}

export default bot;
