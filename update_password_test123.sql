-- Обновить пароль оператора на правильный bcrypt хеш для 'test123'
UPDATE operators 
SET password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqJqKq' 
WHERE email = 'test@operator.com';

-- Проверить результат
SELECT email, password_hash FROM operators WHERE email = 'test@operator.com';
