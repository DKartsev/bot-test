// Тест бота в polling режиме
const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

async function testPollingBot() {
  console.log('🤖 Тестирование бота в polling режиме...\n');

  const botToken = process.env.TG_BOT_TOKEN;
  
  if (!botToken) {
    console.log('❌ TG_BOT_TOKEN не настроен');
    return;
  }

  console.log('✅ Токен бота найден');
  console.log('📡 Режим: polling');

  try {
    // Создаем экземпляр бота с polling
    const bot = new TelegramBot(botToken, { polling: true });
    console.log('✅ Бот инициализирован в polling режиме');

    // Получаем информацию о боте
    const botInfo = await bot.getMe();
    console.log('📊 Информация о боте:');
    console.log(`   Имя: ${botInfo.first_name}`);
    console.log(`   Username: @${botInfo.username}`);
    console.log(`   ID: ${botInfo.id}`);

    // Настраиваем обработчики
    bot.on('message', (msg) => {
      console.log('📨 Получено сообщение:', {
        chatId: msg.chat.id,
        userId: msg.from?.id,
        text: msg.text?.substring(0, 50),
        timestamp: new Date().toISOString()
      });

      // Простой ответ
      if (msg.text) {
        bot.sendMessage(msg.chat.id, `Получено: ${msg.text}`);
      }
    });

    bot.on('callback_query', (query) => {
      console.log('🔘 Получен callback query:', {
        chatId: query.message?.chat.id,
        userId: query.from.id,
        data: query.data,
        timestamp: new Date().toISOString()
      });

      // Отвечаем на callback
      bot.answerCallbackQuery(query.id, { text: 'Callback обработан!' });
    });

    bot.on('polling_error', (error) => {
      console.error('❌ Ошибка polling:', error);
    });

    console.log('\n✅ Бот запущен в polling режиме!');
    console.log('📱 Отправьте сообщение боту для тестирования');
    console.log('⏹️ Нажмите Ctrl+C для остановки\n');

    // Обработка завершения
    process.on('SIGINT', () => {
      console.log('\n🛑 Останавливаем бота...');
      bot.stopPolling();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Ошибка при тестировании бота:', error.message);
  }
}

testPollingBot().catch(console.error);
