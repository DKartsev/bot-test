-- Создание таблиц для новой схемы поддержки

-- Таблица операторов
CREATE TABLE IF NOT EXISTS operators (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_chats INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    balance DECIMAL(10,2) DEFAULT 0,
    deals_count INTEGER DEFAULT 0,
    flags TEXT[] DEFAULT '{}',
    is_blocked BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Таблица чатов (conversations)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    assignee_id INTEGER REFERENCES operators(id),
    handoff VARCHAR(50) DEFAULT 'bot',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMP
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_operators_email ON operators(email);
CREATE INDEX IF NOT EXISTS idx_operators_active ON operators(is_active);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assignee ON conversations(assignee_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Вставка тестового оператора
INSERT INTO operators (first_name, last_name, email, password_hash, role, is_active, max_chats)
VALUES (
    'Test',
    'Operator',
    'test@operator.com',
    '$2b$12$NrEyBtobleL/zRta/iXbJeZzIR1eLSW9FX6IJSDFXqXhpiP0BYvou',
    'admin',
    true,
    10
) ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active;

-- Вставка тестовых пользователей
INSERT INTO users (telegram_id, username, first_name, last_name)
VALUES 
    (111222333, '111222333', '111222333', ''),
    (987654321, '987654321', '987654321', ''),
    (555666777, '555666777', '555666777', ''),
    (123456789, '123456789', '123456789', '')
ON CONFLICT (telegram_id) DO NOTHING;

-- Вставка тестовых чатов
INSERT INTO conversations (id, user_telegram_id, status, handoff)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 111222333, 'open', 'bot'),
    ('550e8400-e29b-41d4-a716-446655440002', 987654321, 'in_progress', 'bot'),
    ('550e8400-e29b-41d4-a716-446655440003', 555666777, 'closed', 'bot'),
    ('550e8400-e29b-41d4-a716-446655440004', 123456789, 'open', 'bot')
ON CONFLICT (id) DO NOTHING;

-- Вставка тестовых сообщений
INSERT INTO messages (conversation_id, sender, content, metadata)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'user', 'Новое сообщение от пользователя', '{"source": "telegram", "channel": "default", "media_urls": [], "media_types": []}'),
    ('550e8400-e29b-41d4-a716-446655440004', 'user', 'Привет!', '{"source": "telegram", "channel": "default", "media_urls": [], "media_types": []}')
ON CONFLICT DO NOTHING;
