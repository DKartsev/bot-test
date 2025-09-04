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

async function testStartCommand() {
  console.log('🤖 Тестирование команды /start...');
  
  try {
    // Тест 1: Простое сообщение
    console.log('\n1. Тест простого сообщения...');
    const simpleMessage = {
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 1, is_bot: false, first_name: 'Test' },
        chat: { id: 1, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'привет'
      }
    };
    
    const response1 = await makeRequest(`${SERVER_URL}/telegram/webhook`, 'POST', simpleMessage);
    console.log('✅ Ответ:', response1);
    
    // Тест 2: Команда /start
    console.log('\n2. Тест команды /start...');
    const startMessage = {
      update_id: 2,
      message: {
        message_id: 2,
        from: { id: 2, is_bot: false, first_name: 'TestUser' },
        chat: { id: 2, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      }
    };
    
    const response2 = await makeRequest(`${SERVER_URL}/telegram/webhook`, 'POST', startMessage);
    console.log('✅ Ответ:', response2);
    
    // Тест 3: Проверка обновлений от бота
    console.log('\n3. Проверка обновлений от бота...');
    const updates = await makeRequest(`${API_BASE}/getUpdates?offset=0&limit=5`);
    
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
testStartCommand();
