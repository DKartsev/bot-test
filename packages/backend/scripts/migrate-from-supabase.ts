import { logInfo, logError } from '../src/utils/logger';
import { Pool } from 'pg';

// Конфигурация для Supabase (источник)
const supabaseConfig = {
  host: process.env.SUPABASE_HOST || 'your-project.supabase.co',
  port: parseInt(process.env.SUPABASE_PORT || '5432'),
  database: process.env.SUPABASE_DB || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres',
  password: process.env.SUPABASE_PASSWORD || 'your-supabase-password',
  ssl: { rejectUnauthorized: false }
};

// Конфигурация для локального PostgreSQL (цель)
const localConfig = {
  host: process.env.DB_HOST || '158.160.169.147',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'support_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: false
};

async function migrateFromSupabase() {
  let supabasePool: Pool | null = null;
  let localPool: Pool | null = null;

  try {
    logInfo('Начинаем миграцию данных из Supabase в PostgreSQL...');

    // Подключаемся к Supabase
    logInfo('Подключаемся к Supabase...');
    supabasePool = new Pool(supabaseConfig);
    await supabasePool.query('SELECT NOW()');
    logInfo('Подключение к Supabase установлено');

    // Подключаемся к локальному PostgreSQL
    logInfo('Подключаемся к локальному PostgreSQL...');
    localPool = new Pool(localConfig);
    await localPool.query('SELECT NOW()');
    logInfo('Подключение к локальному PostgreSQL установлено');

    // Создаем схему и таблицы
    logInfo('Создаем схему и таблицы...');
    await createSchemaAndTables(localPool);

    // Мигрируем данные
    logInfo('Мигрируем данные...');
    await migrateData(supabasePool, localPool);

    logInfo('Миграция завершена успешно!');

  } catch (error) {
    logError('Ошибка миграции', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    if (supabasePool) await supabasePool.end();
    if (localPool) await localPool.end();
    process.exit(0);
  }
}

async function createSchemaAndTables(pool: Pool) {
  // Создаем схему support
  await pool.query('CREATE SCHEMA IF NOT EXISTS support');

  // Создаем таблицу users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE,
      username VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      avatar_url TEXT,
      balance DECIMAL(10,2) DEFAULT 0,
      deals_count INTEGER DEFAULT 0,
      flags JSONB DEFAULT '{}',
      is_blocked BOOLEAN DEFAULT FALSE,
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Создаем таблицу support_chats
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_chats (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      status VARCHAR(50) DEFAULT 'open',
      priority VARCHAR(50) DEFAULT 'medium',
      source VARCHAR(50) DEFAULT 'telegram',
      operator_id INTEGER,
      assigned_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Создаем таблицу messages
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      chat_id INTEGER REFERENCES support_chats(id),
      author_type VARCHAR(50),
      author_id INTEGER,
      text TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_read BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}'
    )
  `);

  // Создаем таблицу operators
  await pool.query(`
    CREATE TABLE IF NOT EXISTS operators (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'operator',
      is_active BOOLEAN DEFAULT TRUE,
      max_chats INTEGER DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )
  `);

  // Создаем индексы
  await pool.query('CREATE INDEX IF NOT EXISTS idx_support_chats_user_id ON support_chats(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_support_chats_status ON support_chats(status)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_support_chats_operator_id ON support_chats(operator_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');

  logInfo('Схема и таблицы созданы');
}

async function migrateData(supabasePool: Pool, localPool: Pool) {
  // Мигрируем пользователей
  logInfo('Мигрируем пользователей...');
  const usersResult = await supabasePool.query('SELECT * FROM users');
  if (usersResult.rows.length > 0) {
    for (const user of usersResult.rows) {
      await localPool.query(`
        INSERT INTO users (telegram_id, username, first_name, last_name, avatar_url, balance, deals_count, flags, is_blocked, is_verified, created_at, last_activity)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (telegram_id) DO UPDATE SET
          username = EXCLUDED.username,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          avatar_url = EXCLUDED.avatar_url,
          balance = EXCLUDED.balance,
          deals_count = EXCLUDED.deals_count,
          flags = EXCLUDED.flags,
          is_blocked = EXCLUDED.is_blocked,
          is_verified = EXCLUDED.is_verified,
          last_activity = EXCLUDED.last_activity
      `, [user.telegram_id, user.username, user.first_name, user.last_name, user.avatar_url, user.balance, user.deals_count, user.flags, user.is_blocked, user.is_verified, user.created_at, user.last_activity]);
    }
    logInfo(`Мигрировано ${usersResult.rows.length} пользователей`);
  }

  // Мигрируем чаты
  logInfo('Мигрируем чаты...');
  const chatsResult = await supabasePool.query('SELECT * FROM support_chats');
  if (chatsResult.rows.length > 0) {
    for (const chat of chatsResult.rows) {
      await localPool.query(`
        INSERT INTO support_chats (user_id, status, priority, source, operator_id, assigned_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          source = EXCLUDED.source,
          operator_id = EXCLUDED.operator_id,
          assigned_at = EXCLUDED.assigned_at,
          updated_at = EXCLUDED.updated_at
      `, [chat.user_id, chat.status, chat.priority, chat.source, chat.operator_id, chat.assigned_at, chat.created_at, chat.updated_at]);
    }
    logInfo(`Мигрировано ${chatsResult.rows.length} чатов`);
  }

  // Мигрируем сообщения
  logInfo('Мигрируем сообщения...');
  const messagesResult = await supabasePool.query('SELECT * FROM messages');
  if (messagesResult.rows.length > 0) {
    for (const message of messagesResult.rows) {
      await localPool.query(`
        INSERT INTO messages (chat_id, author_type, author_id, text, timestamp, is_read, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          text = EXCLUDED.text,
          timestamp = EXCLUDED.timestamp,
          is_read = EXCLUDED.is_read,
          metadata = EXCLUDED.metadata
      `, [message.chat_id, message.author_type, message.author_id, message.text, message.timestamp, message.is_read, message.metadata]);
    }
    logInfo(`Мигрировано ${messagesResult.rows.length} сообщений`);
  }

  // Мигрируем операторов
  logInfo('Мигрируем операторов...');
  const operatorsResult = await supabasePool.query('SELECT * FROM operators');
  if (operatorsResult.rows.length > 0) {
    for (const operator of operatorsResult.rows) {
      await localPool.query(`
        INSERT INTO operators (username, email, password_hash, first_name, last_name, role, is_active, max_chats, created_at, last_login)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (username) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          max_chats = EXCLUDED.max_chats,
          last_login = EXCLUDED.last_login
      `, [operator.username, operator.email, operator.password_hash, operator.first_name, operator.last_name, operator.role, operator.is_active, operator.max_chats, operator.created_at, operator.last_login]);
    }
    logInfo(`Мигрировано ${operatorsResult.rows.length} операторов`);
  }
}

// Запускаем миграцию
migrateFromSupabase().catch(error => {
  logError('Критическая ошибка при миграции', { error: error instanceof Error ? error.message : 'Unknown error' });
  process.exit(1);
});
