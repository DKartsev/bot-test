console.log('=== Отладка JWT в контейнере ===');

// Проверяем переменные окружения
console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

// Импортируем JWT
const jwt = require('jsonwebtoken');

// Проверяем, какой JWT_SECRET используется
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
console.log('Используемый JWT_SECRET:', JWT_SECRET);

// Генерируем тестовый токен
const testPayload = {
  id: 1,
  email: 'test@operator.com',
  role: 'admin',
  type: 'operator'
};

try {
  const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
  console.log('✅ Токен сгенерирован успешно');
  console.log('Токен:', token);
  
  // Проверяем, можем ли мы его верифицировать
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Токен верифицирован успешно');
  console.log('Декодированные данные:', decoded);
  
  // Теперь проверим с секретом из env
  const decodedWithEnv = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Токен верифицирован с process.env.JWT_SECRET');
  console.log('Декодированные данные:', decodedWithEnv);
  
} catch (error) {
  console.log('❌ Ошибка:', error.message);
}

console.log('\n=== Тест с реальным токеном ===');

// Токен, который мы получили от API
const realToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QG9wZXJhdG9yLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cCI6Im9wZXJhdG9yIiwiaWF0IjoxNzU2MTQyOTA4LCJleHAiOjE3NTYyMjkzMDh9.gtafGV0Jmz_L0gLEH3LHKFSGc2LejfPBa4kt4bnGXAI';

try {
  // Декодируем без верификации
  const decodedReal = jwt.decode(realToken);
  console.log('Декодированные данные реального токена:', decodedReal);
  
  // Пробуем верифицировать с текущим секретом
  const verifiedReal = jwt.verify(realToken, JWT_SECRET);
  console.log('✅ Реальный токен верифицирован с текущим секретом');
  console.log('Верифицированные данные:', verifiedReal);
  
} catch (error) {
  console.log('❌ Ошибка верификации реального токена:', error.message);
}
