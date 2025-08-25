const { db } = require('./packages/backend/dist/database/connection');

async function runMigrations() {
  try {
    console.log('🚀 Запускаем миграции базы данных...');
    
    // 0. Создаем таблицу users
    console.log('📋 Создаем таблицу users...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id INTEGER NOT NULL UNIQUE,
        username VARCHAR(255) NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NULL,
        avatar_url VARCHAR(500) NULL,
        balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        deals_count INTEGER NOT NULL DEFAULT 0,
        flags TEXT[] NULL,
        is_blocked BOOLEAN NOT NULL DEFAULT false,
        is_verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_activity TIMESTAMP NULL
      )
    `);
    
    // Создаем индексы для users
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    
    console.log('✅ Таблица users создана');
    
    // 1. Создаем таблицу operators
    console.log('📋 Создаем таблицу operators...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS operators (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role VARCHAR(50) NOT NULL DEFAULT 'operator' CHECK (role IN ('operator', 'senior_operator', 'admin')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        max_chats INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_activity TIMESTAMP NULL
      )
    `);
    
    // Создаем индексы для operators
    await db.query('CREATE INDEX IF NOT EXISTS idx_operators_email ON operators(email)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_operators_role ON operators(role)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_operators_active ON operators(is_active)');
    
    console.log('✅ Таблица operators создана');
    
    // 2. Создаем таблицу support_chats
    console.log('📋 Создаем таблицу support_chats...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS support_chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'waiting',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        source VARCHAR(50) NOT NULL DEFAULT 'telegram',
        operator_id INTEGER NULL,
        is_pinned BOOLEAN NOT NULL DEFAULT false,
        is_important BOOLEAN NOT NULL DEFAULT false,
        unread_count INTEGER NOT NULL DEFAULT 0,
        tags TEXT[] NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Создаем индексы для support_chats
    await db.query('CREATE INDEX IF NOT EXISTS idx_support_chats_status ON support_chats(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_support_chats_operator_id ON support_chats(operator_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_support_chats_priority ON support_chats(priority)');
    
    console.log('✅ Таблица support_chats создана');
    
    // 3. Создаем таблицу support_messages
    console.log('📋 Создаем таблицу support_messages...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL,
        author_type VARCHAR(50) NOT NULL CHECK (author_type IN ('user', 'operator')),
        author_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        metadata JSONB NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Создаем индексы для support_messages
    await db.query('CREATE INDEX IF NOT EXISTS idx_support_messages_chat_id ON support_messages(chat_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_support_messages_timestamp ON support_messages(timestamp)');
    
    console.log('✅ Таблица support_messages создана');
    
    // 4. Создаем тестового оператора
    console.log('👤 Создаем тестового оператора...');
    const operatorResult = await db.query(`
      INSERT INTO operators (name, email, role, is_active, max_chats)
      VALUES ('Test Operator', 'test@operator.com', 'admin', true, 10)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        max_chats = EXCLUDED.max_chats
      RETURNING *
    `);
    
    console.log('✅ Тестовый оператор создан:', operatorResult.rows[0]);
    
    // 5. Создаем тестового пользователя
    console.log('👤 Создаем тестового пользователя...');
    const userResult = await db.query(`
      INSERT INTO users (telegram_id, username, first_name, last_name, balance, deals_count, is_blocked, is_verified)
      VALUES (123456789, 'test_user', 'Тестовый', 'Пользователь', 1000.00, 5, false, true)
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        balance = EXCLUDED.balance,
        deals_count = EXCLUDED.deals_count,
        is_blocked = EXCLUDED.is_blocked,
        is_verified = EXCLUDED.is_verified
      RETURNING *
    `);
    
    console.log('✅ Тестовый пользователь создан:', userResult.rows[0]);
    
    // 6. Создаем тестовый чат
    console.log('💬 Создаем тестовый чат...');
    const chatResult = await db.query(`
      INSERT INTO support_chats (user_id, status, priority, source, tags)
      VALUES ($1, 'waiting', 'medium', 'telegram', ARRAY['заказ', 'вопрос'])
      RETURNING *
    `, [userResult.rows[0].id]);
    
    console.log('✅ Тестовый чат создан:', chatResult.rows[0]);
    
    // 7. Создаем тестовое сообщение
    console.log('💬 Создаем тестовое сообщение...');
    const messageResult = await db.query(`
      INSERT INTO support_messages (chat_id, author_type, author_id, text, metadata)
      VALUES ($1, 'user', $2, 'Здравствуйте! У меня есть вопрос по заказу.', '{"source": "telegram", "channel": "telegram"}')
      RETURNING *
    `, [chatResult.rows[0].id, userResult.rows[0].id]);
    
    console.log('✅ Тестовое сообщение создано:', messageResult.rows[0]);
    
    console.log('\n🎉 Все миграции успешно выполнены!');
    console.log('📊 Статистика:');
    console.log(`  - Операторов: ${operatorResult.rows.length}`);
    console.log(`  - Пользователей: ${userResult.rows.length}`);
    console.log(`  - Чатов: ${chatResult.rows.length}`);
    console.log(`  - Сообщений: ${messageResult.rows.length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Ошибка выполнения миграций:', error);
    process.exit(1);
  }
}

runMigrations();
