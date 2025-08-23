-- Миграция 002: Тестовые данные
-- Дата: 2024-01-20
-- Описание: Добавление тестовых данных для разработки

BEGIN;

-- Добавление тестовых операторов
INSERT INTO operators (name, email, password_hash, role) VALUES
('Анна Петрова', 'anna.petrova@company.com', '$2b$10$test_hash_1', 'senior_operator'),
('Иван Сидоров', 'ivan.sidorov@company.com', '$2b$10$test_hash_2', 'operator'),
('Мария Козлова', 'maria.kozlova@company.com', '$2b$10$test_hash_3', 'admin');

-- Добавление тестовых пользователей
INSERT INTO users (telegram_id, username, first_name, last_name, balance, deals_count, flags) VALUES
(123456789, 'ivan_petrov', 'Иван', 'Петров', 15000.00, 25, ARRAY['verified', 'vip']),
(987654321, 'anna_sidorova', 'Анна', 'Сидорова', 5000.00, 12, ARRAY['verified']),
(555666777, 'maria_koz', 'Мария', 'Козлова', 25000.00, 45, ARRAY['verified', 'vip', 'premium']);

-- Добавление тестовых чатов
INSERT INTO chats (user_id, status, priority, source, tags) VALUES
(1, 'waiting', 'high', 'telegram', ARRAY['вывод', 'проблема']),
(2, 'in_progress', 'medium', 'telegram', ARRAY['общий']),
(3, 'closed', 'low', 'telegram', ARRAY['поддержка']);

-- Добавление тестовых сообщений
INSERT INTO messages (chat_id, author_type, author_id, text, is_read) VALUES
(1, 'user', 1, 'Здравствуйте! У меня проблема с выводом средств', false),
(1, 'bot', NULL, 'Добрый день! Понимаю вашу проблему. Давайте разберемся пошагово.', true),
(1, 'user', 1, 'Пытаюсь вывести 5000 рублей, но система пишет "Ошибка обработки"', false),
(2, 'user', 2, 'Спасибо за помощь!', true),
(2, 'operator', 1, 'Рад был помочь! Если возникнут вопросы, обращайтесь.', true);

-- Добавление тестовых заметок
INSERT INTO notes (chat_id, operator_id, content, type, is_private) VALUES
(1, 1, 'Пользователь VIP, требует особого внимания', 'internal', true),
(2, 1, 'Проблема решена, пользователь доволен', 'resolution', false);

-- Добавление тестовых кейсов
INSERT INTO cases (chat_id, operator_id, title, description, status, priority) VALUES
(1, 1, 'Проблема с выводом средств', 'Пользователь не может вывести 5000 рублей', 'open', 'high'),
(2, 1, 'Общий вопрос', 'Стандартный вопрос пользователя', 'resolved', 'medium');

-- Добавление тестовых шаблонов ответов
INSERT INTO canned_responses (title, content, category, tags, is_global) VALUES
('Приветствие', 'Здравствуйте! Чем могу помочь?', 'приветствие', ARRAY['общий'], true),
('Благодарность', 'Спасибо за обращение!', 'вежливость', ARRAY['общий'], true),
('Передача оператору', 'Ваш запрос передан оператору. Ожидайте ответа.', 'эскалация', ARRAY['оператор'], true);

COMMIT;
