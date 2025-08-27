-- Обновить пароль оператора на правильный bcrypt хеш для 'test123'
UPDATE operators 
SET password_hash = '$2b$12$NrEyBtobleL/zRta/iXbJeZzIR1eLSW9FX6IJSDFXqXhpiP0BYvou' 
WHERE email = 'test@operator.com';

-- Проверить результат
SELECT email, password_hash FROM operators WHERE email = 'test@operator.com';
