import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import { z } from 'zod';
import logger from './utils/logger';
import textHandler from './handlers/textHandler';
import mediaHandler from './handlers/mediaHandler';

config();

const envSchema = z.object({ BOT_TOKEN: z.string() });

let bot: Telegraf;

try {
  const { BOT_TOKEN } = envSchema.parse(process.env);
  bot = new Telegraf(BOT_TOKEN);
  bot.on('text', textHandler);
  bot.on(['photo', 'video'], mediaHandler);
  logger.info('Bot initialized');
} catch (err) {
  logger.error({ err }, 'Failed to initialize bot');
  throw err;
}

export default bot;
