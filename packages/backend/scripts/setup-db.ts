import 'dotenv/config';
import { db } from '../src/database/connection';
import { logInfo, logError } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  try {
    logInfo('Настройка базы данных...');
    
    // Проверяем подключение
    const result = await db.query('SELECT NOW() as current_time');
    logInfo('Подключение к базе данных установлено', {
      timestamp: result.rows[0].current_time
    });

    // Создаем схему support если её нет
    try {
      await db.query('CREATE SCHEMA IF NOT EXISTS support');
      logInfo('Схема support создана/проверена');
    } catch (error) {
      logError('Ошибка создания схемы support', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Создаем таблицу users если её нет
    try {
      await db.query(`
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
      logInfo('Таблица users создана/проверена');
    } catch (error) {
      logError('Ошибка создания таблицы users', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Создаем таблицу support_chats если её нет
    try {
      await db.query(`
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
      logInfo('Таблица support_chats создана/проверена');
    } catch (error) {
      logError('Ошибка создания таблицы support_chats', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Создаем таблицу messages если её нет
    try {
      await db.query(`
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
      logInfo('Таблица messages создана/проверена');
    } catch (error) {
      logError('Ошибка создания таблицы messages', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Создаем таблицу operators если её нет
    try {
      await db.query(`
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
      logInfo('Таблица operators создана/проверена');
    } catch (error) {
      logError('Ошибка создания таблицы operators', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Создаем индексы для оптимизации
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_support_chats_user_id ON support_chats(user_id)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_support_chats_status ON support_chats(status)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_support_chats_operator_id ON support_chats(operator_id)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');
      logInfo('Индексы созданы/проверены');
    } catch (error) {
      logError('Ошибка создания индексов', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Добавляем тестовые данные если таблицы пустые
    try {
      const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
      if (parseInt(usersCount.rows[0].count) === 0) {
        await db.query(`
          INSERT INTO users (telegram_id, username, first_name, last_name) 
          VALUES 
            (123456789, 'testuser1', 'Test', 'User1'),
            (987654321, 'testuser2', 'Test', 'User2')
        `);
        logInfo('Добавлены тестовые пользователи');
      }

      const chatsCount = await db.query('SELECT COUNT(*) as count FROM support_chats');
      if (parseInt(chatsCount.rows[0].count) === 0) {
        await db.query(`
          INSERT INTO support_chats (user_id, status, priority, source) 
          VALUES 
            (1, 'open', 'medium', 'telegram'),
            (2, 'in_progress', 'high', 'telegram')
        `);
        logInfo('Добавлены тестовые чаты');
      }

      const messagesCount = await db.query('SELECT COUNT(*) as count FROM messages');
      if (parseInt(messagesCount.rows[0].count) === 0) {
        await db.query(`
          INSERT INTO messages (chat_id, author_type, author_id, text) 
          VALUES 
            (1, 'user', 1, 'Привет, нужна помощь'),
            (1, 'operator', 1, 'Здравствуйте! Чем могу помочь?'),
            (2, 'user', 2, 'У меня проблема с заказом')
        `);
        logInfo('Добавлены тестовые сообщения');
      }
    } catch (error) {
      logError('Ошибка добавления тестовых данных', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    logInfo('Настройка базы данных завершена успешно');

  } catch (error) {
    logError('Ошибка настройки базы данных', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Запускаем настройку
setupDatabase().catch(error => {
  logError('Критическая ошибка при настройке БД', { error: error instanceof Error ? error.message : 'Unknown error' });
  process.exit(1);
});
