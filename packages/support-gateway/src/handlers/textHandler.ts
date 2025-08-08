import { Context } from 'telegraf';
import logger from '../utils/logger';

export default async function textHandler(ctx: Context) {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    logger.info({ text }, 'Received text message');
    await ctx.reply('Text received');
  } catch (err) {
    logger.error({ err }, 'Error in textHandler');
  }
}
