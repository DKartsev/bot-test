const http = require('http');

// Токен от отладочного эндпоинта /debug-jwt
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QG9wZXJhdG9yLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJvcGVyYXRvciIsImlhdCI6MTc1NjE0Mzg0NCwiZXhwIjoxNzU2MTQ3NDQ0fQ.mnBRBr0HTU6y94qg-Ta-PYBEN6Vy2i9S8gsSeXOX-Nc';

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

console.log('Тестируем эндпоинт /api/stats с токеном от /debug-jwt...');
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
      console.log('✅ Успешно! Эндпоинт /api/stats работает с токеном от /debug-jwt');
    } else {
      console.log('❌ Ошибка:', res.statusCode);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
