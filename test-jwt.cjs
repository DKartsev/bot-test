const jwt = require('jsonwebtoken');

// Токен, который мы получили
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QG9wZXJhdG9yLmNvbSIsInJvbGUiOiJhZG1pbiIsInR5cCI6Im9wZXJhdG9yIiwiaWF0IjoxNzU2MTQxODI3LCJleHAiOjE3NTYyMjgyMjd9.rILzQXep0joOkr-zSy35oau7z_M9H5ShcG4XXVNciec';

// Секрет, который используется в контейнере
const JWT_SECRET = 'a-very-secret-and-long-string-for-jwt';

console.log('Проверяем токен...');

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Токен валиден!');
  console.log('Декодированные данные:', decoded);
} catch (error) {
  console.log('❌ Ошибка верификации токена:', error.message);
  
  // Попробуем декодировать без верификации
  try {
    const decodedWithoutVerification = jwt.decode(token);
    console.log('Декодированные данные (без верификации):', decodedWithoutVerification);
  } catch (decodeError) {
    console.log('Ошибка декодирования:', decodeError.message);
  }
}
