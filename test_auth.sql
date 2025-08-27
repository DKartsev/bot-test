-- Проверить текущего оператора
SELECT id, email, first_name, last_name, password_hash, is_active 
FROM operators 
WHERE email = 'test@operator.com';

-- Создать нового оператора с простым паролем для тестирования
INSERT INTO operators (username, first_name, last_name, email, password_hash, role, is_active, max_chats)
VALUES (
  'test_operator_2',
  'Test',
  'Operator2', 
  'test2@operator.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqJqKq',
  'operator',
  true,
  10
) ON CONFLICT (email) DO NOTHING;

-- Проверить результат
SELECT id, email, first_name, last_name, password_hash, is_active 
FROM operators 
WHERE email IN ('test@operator.com', 'test2@operator.com');
