import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import type { QAService } from '../app/qa/QAService.js';

// The makeBot function now accepts dependencies
export function makeBot(deps: { qaService: QAService }) {
  // TODO: Use deps.qaService for bot functionality
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    // This case should be handled by the plugin that calls this function
    throw new Error('TELEGRAM_BOT_TOKEN missing');
  }
  const bot = new Telegraf(token);

  bot.start(async (ctx: any) => {
    await ctx.reply('Здравствуйте! Чем могу помочь?');
  });

  bot.on('text', async (ctx: any) => {
    const text: string = String(ctx.message.text ?? '');
    const reply = text.trim().length > 0 ? 'Сообщение получено.' : 'Пустое сообщение.';
    await ctx.reply(reply);
  });

  const botWebhookCallback = (bot as any).webhookCallback(env.TG_WEBHOOK_PATH);

  return { bot, botWebhookCallback };
}

export type Bot = Telegraf;
