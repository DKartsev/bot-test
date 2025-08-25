import { db } from '../src/database/connection';
import { logInfo, logError } from '../src/utils/logger';

async function checkDatabase() {
  try {
    logInfo('Проверка подключения к базе данных...');
    
    // Проверяем подключение
    const result = await db.query('SELECT NOW() as current_time, version() as db_version');
    
    logInfo('Подключение к базе данных успешно', {
      currentTime: result.rows[0].current_time,
      dbVersion: result.rows[0].db_version
    });

    // Проверяем существование таблиц
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    logInfo('Найденные таблицы:', {
      tables: tablesResult.rows.map(row => row.table_name),
      count: tablesResult.rows.length
    });

    // Проверяем таблицу чатов
    try {
      const chatsResult = await db.query('SELECT COUNT(*) as count FROM support_chats');
      logInfo('Таблица support_chats доступна', {
        chatCount: chatsResult.rows[0].count
      });
    } catch (error) {
      logError('Таблица support_chats недоступна', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Проверяем таблицу пользователей
    try {
      const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
      logInfo('Таблица users доступна', {
        userCount: usersResult.rows[0].count
      });
    } catch (error) {
      logError('Таблица users недоступна', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Проверяем таблицу сообщений
    try {
      const messagesResult = await db.query('SELECT COUNT(*) as count FROM messages');
      logInfo('Таблица messages доступна', {
        messageCount: messagesResult.rows[0].count
      });
    } catch (error) {
      logError('Таблица messages недоступна', { error: error instanceof Error ? error.message : 'Unknown error' });
    }

  } catch (error) {
    logError('Ошибка проверки базы данных', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Запускаем проверку
checkDatabase().catch(error => {
  logError('Критическая ошибка при проверке БД', { error: error instanceof Error ? error.message : 'Unknown error' });
  process.exit(1);
});
