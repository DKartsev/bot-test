import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import type { QAService } from '../app/qa/QAService.js';

// The makeBot function now accepts dependencies
export function makeBot(deps: { qaService: QAService }) {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    // This case should be handled by the plugin that calls this function
    throw new Error('TELEGRAM_BOT_TOKEN missing');
  }
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await ctx.reply('Здравствуйте! Чем могу помочь?');
  });

  bot.on('text', async (ctx) => {
    try {
      const result = await deps.qaService.ask(ctx.message.text);
      await ctx.reply(result.answer);
    } catch (err) {
      console.error('Error processing message:', err);
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  const botWebhookCallback = bot.webhookCallback(env.TG_WEBHOOK_PATH);

  return { bot, botWebhookCallback };
}

export type Bot = Telegraf;
