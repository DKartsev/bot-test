const TelegramBot = require('node-telegram-bot-api');

const token = '8466377396:AAGOt2PImCCeFkC3vEIsM7KISv87Lpj9OhY';
const bot = new TelegramBot(token, {polling: true});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  console.log(`Получено сообщение: ${text} от ${msg.from.first_name} (${chatId})`);

  if (text === '/start') {
    bot.sendMessage(chatId, 'Привет! Я работаю!');
  } else {
    bot.sendMessage(chatId, `Вы написали: ${text}`);
  }
});

console.log('Бот запущен и слушает сообщения...');
