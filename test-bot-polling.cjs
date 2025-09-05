const https = require('https');

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
    
    const client = url.startsWith('https:') ? https : require('http');
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

async function testBotWithPolling() {
  console.log('🤖 Тестирование бота с polling...');
  
  try {
    // Проверяем health
    console.log('\n1. Проверка health...');
    const health = await makeRequest(`${SERVER_URL}/health`);
    console.log('✅ Health:', health.status);
    
    // Получаем информацию о боте
    console.log('\n2. Получение информации о боте...');
    const botInfo = await makeRequest(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    console.log('✅ Бот:', botInfo.result.first_name, `(@${botInfo.result.username})`);
    
    // Получаем обновления (polling)
    console.log('\n3. Получение обновлений...');
    const updates = await makeRequest(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
    console.log('✅ Обновлений получено:', updates.result.length);
    
    if (updates.result.length > 0) {
      console.log('\n📨 Последние сообщения:');
      updates.result.forEach((update, index) => {
        if (update.message) {
          console.log(`  ${index + 1}. От ${update.message.from.first_name}: "${update.message.text}"`);
        }
      });
    } else {
      console.log('ℹ️ Нет новых сообщений. Отправьте /start боту в Telegram.');
    }
    
    // Тестируем отправку сообщения
    console.log('\n4. Тестирование отправки сообщения...');
    const testMessage = {
      chat_id: 123456789, // Тестовый ID
      text: 'Тестовое сообщение от бота'
    };
    
    try {
      const sendResult = await makeRequest(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, 'POST', testMessage);
      console.log('✅ Сообщение отправлено:', sendResult.ok);
    } catch (error) {
      console.log('⚠️ Ошибка отправки (ожидаемо для тестового ID):', error.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Запускаем тест
testBotWithPolling();
