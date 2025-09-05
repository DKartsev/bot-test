// Тест Telegram бота
const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

async function testTelegramBot() {
  console.log('🤖 Тестирование Telegram бота...\n');

  const botToken = process.env.TG_BOT_TOKEN;
  
  if (!botToken) {
    console.log('❌ TG_BOT_TOKEN не настроен');
    return;
  }

  console.log('✅ Токен бота найден');

  try {
    // Создаем экземпляр бота
    const bot = new TelegramBot(botToken, { polling: false });
    console.log('✅ Бот инициализирован');

    // Получаем информацию о боте
    const botInfo = await bot.getMe();
    console.log('📊 Информация о боте:');
    console.log(`   Имя: ${botInfo.first_name}`);
    console.log(`   Username: @${botInfo.username}`);
    console.log(`   ID: ${botInfo.id}`);
    console.log(`   Может присоединяться к группам: ${botInfo.can_join_groups}`);
    console.log(`   Может читать все сообщения группы: ${botInfo.can_read_all_group_messages}`);

    // Проверяем webhook
    const webhookInfo = await bot.getWebHookInfo();
    console.log('\n📡 Информация о webhook:');
    console.log(`   URL: ${webhookInfo.url || 'не настроен'}`);
    console.log(`   Ожидает подтверждения: ${webhookInfo.pending_update_count}`);
    console.log(`   Последняя ошибка: ${webhookInfo.last_error_message || 'нет'}`);

    // Тестируем отправку сообщения (если указан chat_id)
    const testChatId = process.env.TG_CHAT_ID;
    if (testChatId) {
      console.log(`\n📤 Тестируем отправку сообщения в чат ${testChatId}...`);
      
      try {
        const message = await bot.sendMessage(testChatId, '🤖 Тестовое сообщение от бота!');
        console.log('✅ Сообщение отправлено успешно');
        console.log(`   ID сообщения: ${message.message_id}`);
      } catch (error) {
        console.log('❌ Ошибка отправки сообщения:', error.message);
      }
    } else {
      console.log('\n⚠️ TG_CHAT_ID не настроен, пропускаем тест отправки сообщения');
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании бота:', error.message);
  }
}

testTelegramBot().catch(console.error);
