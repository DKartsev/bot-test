// Скрипт для обновления webhook URL
const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

async function updateWebhook() {
  console.log('🔄 Обновление webhook URL...\n');

  const botToken = process.env.TG_BOT_TOKEN;
  const newWebhookUrl = process.env.PUBLIC_URL + process.env.TG_WEBHOOK_PATH + '/' + process.env.TG_WEBHOOK_SECRET;
  
  if (!botToken) {
    console.log('❌ TG_BOT_TOKEN не настроен');
    return;
  }

  console.log('📊 Текущие настройки:');
  console.log(`   PUBLIC_URL: ${process.env.PUBLIC_URL}`);
  console.log(`   TG_WEBHOOK_PATH: ${process.env.TG_WEBHOOK_PATH}`);
  console.log(`   TG_WEBHOOK_SECRET: ${process.env.TG_WEBHOOK_SECRET}`);
  console.log(`   Новый webhook URL: ${newWebhookUrl}`);

  try {
    // Создаем экземпляр бота
    const bot = new TelegramBot(botToken, { polling: false });
    console.log('✅ Бот инициализирован');

    // Получаем текущий webhook
    const currentWebhook = await bot.getWebHookInfo();
    console.log('\n📡 Текущий webhook:');
    console.log(`   URL: ${currentWebhook.url || 'не настроен'}`);
    console.log(`   Ожидает подтверждения: ${currentWebhook.pending_update_count}`);

    // Удаляем старый webhook
    console.log('\n🗑️ Удаляем старый webhook...');
    const deleteResult = await bot.deleteWebHook();
    console.log('✅ Старый webhook удален');

    // Устанавливаем новый webhook
    console.log('\n🔄 Устанавливаем новый webhook...');
    const setResult = await bot.setWebHook(newWebhookUrl);
    console.log('✅ Новый webhook установлен');

    // Проверяем новый webhook
    const newWebhook = await bot.getWebHookInfo();
    console.log('\n📡 Новый webhook:');
    console.log(`   URL: ${newWebhook.url}`);
    console.log(`   Ожидает подтверждения: ${newWebhook.pending_update_count}`);

    console.log('\n✅ Webhook успешно обновлен!');

  } catch (error) {
    console.error('❌ Ошибка при обновлении webhook:', error.message);
  }
}

updateWebhook().catch(console.error);
