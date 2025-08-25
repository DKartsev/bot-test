const http = require('http');

// Новый токен, полученный после исправления JWT импорта
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QG9wZXJhdG9yLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cCI6Im9wZXJhdG9yIiwiaWF0IjoxNzU2MTQyOTA4LCJleHAiOjE3NTYyMjkzMDh9.gtafGV0Jmz_L0gLEH3LHKFSGc2LejfPBa4kt4bnGXAI';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/stats',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

console.log('Тестируем эндпоинт /api/stats с новым JWT токеном...');
console.log('Токен:', token);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Успешно! Эндпоинт /api/stats работает с JWT токеном');
    } else {
      console.log('❌ Ошибка:', res.statusCode);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
