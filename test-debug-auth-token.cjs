const http = require('http');

// Токен от отладочного эндпоинта /debug-auth
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QG9wZXJhdG9yLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJvcGVyYXRvciIsImlhdCI6MTc1NjE0NTI0MCwiZXhwIjoxNzU2MTQ4ODQwfQ.5n8fw5RwUSuGmhzFmjbWq1-4OY81oTCQ04SJPUCxGwE';

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

console.log('Тестируем эндпоинт /api/stats с токеном от /debug-auth...');
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
      console.log('✅ Успешно! Эндпоинт /api/stats работает с токеном от /debug-auth');
    } else {
      console.log('❌ Ошибка:', res.statusCode);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
