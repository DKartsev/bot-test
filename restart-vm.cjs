const https = require('https');
const http = require('http');

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

async function testAfterRestart() {
  console.log('🔄 Тестирование после перезапуска...');
  
  try {
    // Проверяем health
    console.log('\n1. Проверка health...');
    const health = await makeRequest(`${SERVER_URL}/health`);
    console.log('✅ Health:', health.status);
    
    // Тестируем /start (только webhook обработку, без отправки в Telegram)
    console.log('\n2. Тестирование /start...');
    const startMessage = {
      message: {
        message_id: 1,
        from: { id: 123456789, is_bot: false, first_name: 'Test' },
        chat: { id: 123456789, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      }
    };
    
    const response = await makeRequest(`${SERVER_URL}/telegram/webhook`, 'POST', startMessage);
    console.log('✅ Ответ webhook:', response);
    
    if (response.error) {
      console.log('❌ Все еще есть ошибка:', response.error);
    } else {
      console.log('🎉 Webhook работает!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Запускаем тест
testAfterRestart();
