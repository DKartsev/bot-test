console.log('=== Тест JWT в API процессе ===');

// Имитируем точно ту же логику, что и в API
const jwt = require('jsonwebtoken');

// Проверяем переменные окружения
console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

// Используем ту же логику, что и в API
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
console.log('Используемый JWT_SECRET в API:', JWT_SECRET);

// Генерируем токен точно как в API
const testPayload = {
  id: 1,
  email: 'test@operator.com',
  role: 'admin',
  type: 'operator'  // Обратите внимание: type, а не typ
};

try {
  const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
  console.log('✅ Токен сгенерирован успешно в API');
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

console.log('\n=== Сравнение с реальным токеном ===');

// Реальный токен от API
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
  
  // Попробуем с fallback секретом
  const fallbackSecret = 'dev-jwt-secret-key-32-chars-minimum-required';
  try {
    const verifiedWithFallback = jwt.verify(realToken, fallbackSecret);
    console.log('✅ Реальный токен верифицирован с fallback секретом!');
    console.log('Верифицированные данные:', verifiedWithFallback);
  } catch (fallbackError) {
    console.log('❌ Ошибка верификации с fallback секретом:', fallbackError.message);
  }
}
