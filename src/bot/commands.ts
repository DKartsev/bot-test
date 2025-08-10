import { Telegraf } from 'telegraf';
import { createRequire } from 'node:module';
import { logger } from '../utils/logger.js';
import { intentClassifier } from './intent.js';

const require = createRequire(import.meta.url);
const { answerWithRag } = require('../rag/answerer.js');
const { retrieve } = require('../rag/retriever.js');

const token = process.env.TG_BOT_TOKEN;
if (!token) {
  throw new Error('TG_BOT_TOKEN is not set');
}

const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply('Привет! Я на связи 🙌 Напишите /ticket, чтобы создать обращение.'));
bot.help((ctx) => ctx.reply('Доступно: /start, /help, /ticket'));
bot.command('ticket', async (ctx) => {
  await ctx.reply('Опишите проблему одним сообщением. Мы создадим тикет и свяжемся 🙌');
});
bot.on('text', async (ctx) => {
  const text = ctx.message.text || '';
  const intent = intentClassifier(text);
  logger.info({ intent, text }, 'incoming message');
  try {
    if (intent === 'question') {
      const { contextText, citations } = await retrieve(text);
      const { answer } = await answerWithRag({
        question: text,
        lang: ctx.from?.language_code,
        contextText,
        citations
      });
      await ctx.reply(answer);
    } else if (intent === 'ticket') {
      await ctx.reply('Тикет создан, оператор скоро свяжется.');
    } else {
      await ctx.reply('Перенаправляю на оператора...');
    }
  } catch (err) {
    logger.error({ err }, 'text handler failed');
    await ctx.reply('Произошла ошибка. Попробуйте позже или используйте /ticket.');
  }
});
bot.catch((err) => logger.error({ err }, 'bot error'));

export default bot;
