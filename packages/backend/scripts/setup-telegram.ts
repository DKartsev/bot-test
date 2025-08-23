import { env } from '../src/config/env';

async function setupTelegramWebhook() {
  try {
    console.log('🚀 Настройка Telegram webhook...');
    
    if (!env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
    }

    const webhookUrl = `${env.PUBLIC_URL || `http://localhost:${env.PORT}`}/telegram/webhook`;
    
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    
    // Устанавливаем webhook через Telegram Bot API
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'callback_query']
      })
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Webhook установлен успешно');
      console.log(`📊 Информация: ${JSON.stringify(result.result, null, 2)}`);
    } else {
      console.error('❌ Ошибка установки webhook:', result.description);
    }

    // Получаем информацию о текущем webhook
    const webhookInfoResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const webhookInfo = await webhookInfoResponse.json();
    
    if (webhookInfo.ok) {
      console.log('📋 Текущая информация о webhook:');
      console.log(JSON.stringify(webhookInfo.result, null, 2));
    }

  } catch (error) {
    console.error('💥 Ошибка настройки webhook:', error);
    process.exit(1);
  }
}

// Запускаем настройку
setupTelegramWebhook();
