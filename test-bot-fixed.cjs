const https = require('https');
const http = require('http');

const BOT_TOKEN = '8466377396:AAGOt2PImCCeFkC3vEIsM7KISv87Lpj9OhY';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SERVER_URL = 'http://158.160.169.147:3000';

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

async function testBotFixed() {
  console.log('🤖 Тестирование исправленного бота...');
  
  try {
    // Создаем тестовое сообщение /start
    const testMessage = {
      update_id: 999999,
      message: {
        message_id: 1,
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'Test',
          username: 'testuser'
        },
        chat: {
          id: 123456789,
          first_name: 'Test',
          type: 'private'
        },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      }
    };
    
    console.log('📨 Отправляем тестовое сообщение /start на сервер...');
    const response = await makeRequest(`${SERVER_URL}/telegram/webhook`, 'POST', testMessage);
    console.log('✅ Ответ сервера:', response);
    
    // Проверяем, есть ли ответ от бота
    console.log('\n📋 Проверяем обновления от бота...');
    const updates = await makeRequest(`${API_BASE}/getUpdates?offset=0&limit=10`);
    
    if (updates.ok && updates.result.length > 0) {
      console.log(`📨 Найдено ${updates.result.length} обновлений:`);
      updates.result.forEach((update, index) => {
        if (update.message) {
          console.log(`  ${index + 1}. От ${update.message.from.first_name}: ${update.message.text || '[не текстовое сообщение]'}`);
        }
      });
    } else {
      console.log('📭 Обновлений не найдено');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Запускаем тест
testBotFixed();
