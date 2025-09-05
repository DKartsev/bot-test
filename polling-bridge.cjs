const https = require('https');
const http = require('http');

const BOT_TOKEN = '8466377396:AAGOt2PImCCeFkC3vEIsM7KISv87Lpj9OhY';
const SERVER_URL = 'http://158.160.197.7:3000';

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Invalid JSON: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function processUpdates() {
  try {
    // Получаем обновления от Telegram
    const updates = await makeRequest(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
    
    if (updates.result && updates.result.length > 0) {
      console.log(`📨 Получено ${updates.result.length} обновлений`);
      
      for (const update of updates.result) {
        console.log(`🔄 Обработка обновления ${update.update_id}:`, update.message?.text || 'callback_query');
        
        // Отправляем обновление на наш webhook
        try {
          const response = await makeRequest(`${SERVER_URL}/telegram/webhook`, 'POST', update);
          console.log(`✅ Webhook ответ:`, response);
        } catch (error) {
          console.error(`❌ Ошибка webhook:`, error.message);
        }
      }
      
      // Получаем последний update_id для следующего запроса
      const lastUpdateId = updates.result[updates.result.length - 1].update_id;
      console.log(`📝 Последний update_id: ${lastUpdateId}`);
      
      // Удаляем обработанные обновления
      await makeRequest(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}`);
      
    } else {
      console.log('⏳ Нет новых обновлений');
    }
    
  } catch (error) {
    console.error('❌ Ошибка обработки обновлений:', error.message);
  }
}

async function startPolling() {
  console.log('🤖 Запуск polling bridge...');
  console.log(`📡 Бот: @RapiraProdTestBot`);
  console.log(`🌐 Сервер: ${SERVER_URL}`);
  console.log('⏰ Polling каждые 5 секунд...\n');
  
  // Обрабатываем существующие обновления
  await processUpdates();
  
  // Запускаем периодический polling
  setInterval(processUpdates, 5000);
}

// Запускаем polling
startPolling();
