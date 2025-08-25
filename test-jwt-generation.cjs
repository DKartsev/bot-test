console.log('=== Тест генерации JWT токена ===');

// Имитируем код из routes/operator.ts
const jwt = require('jsonwebtoken');

// Проверяем переменные окружения
console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

// Используем ту же логику, что и в коде
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
console.log('Используемый JWT_SECRET:', JWT_SECRET);

// Генерируем токен как в коде
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
