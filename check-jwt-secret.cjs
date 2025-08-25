console.log('=== Проверка JWT_SECRET ===');
console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

// Попробуем сгенерировать токен с текущим секретом
const jwt = require('jsonwebtoken');

const testPayload = {
  id: 1,
  email: 'test@test.com',
  role: 'admin'
};

try {
  const token = jwt.sign(testPayload, process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required', { expiresIn: '1h' });
  console.log('✅ Токен сгенерирован успешно');
  console.log('Токен:', token);
  
  // Попробуем верифицировать
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required');
  console.log('✅ Токен верифицирован успешно');
  console.log('Декодированные данные:', decoded);
} catch (error) {
  console.log('❌ Ошибка:', error.message);
}
