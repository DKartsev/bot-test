import { Context } from 'telegraf';
import logger from '../utils/logger';

export default async function mediaHandler(ctx: Context) {
  try {
    logger.info('Received media message');
    await ctx.reply('Media received');
  } catch (err) {
    logger.error({ err }, 'Error in mediaHandler');
  }
}
