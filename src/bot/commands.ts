import { Telegraf } from 'telegraf';

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
bot.on('text', (ctx) => {
  // эхо для отладки
  ctx.reply(`Понял: "${ctx.message.text}"`);
});
bot.catch((err) => console.error('[bot.error]', err));

export default bot;
