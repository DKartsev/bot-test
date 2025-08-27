-- Установить простой пароль для тестирования
UPDATE operators 
SET password_hash = '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
WHERE email = 'test@operator.com';

-- Проверить результат
SELECT email, password_hash FROM operators WHERE email = 'test@operator.com';
