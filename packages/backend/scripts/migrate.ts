import { db } from '../src/database/connection';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  try {
    console.log('🚀 Запуск миграций базы данных...');
    
    // Проверяем подключение к БД
    const isConnected = await db.ping();
    if (!isConnected) {
      throw new Error('Не удалось подключиться к базе данных');
    }
    
    console.log('✅ Подключение к базе данных установлено');
    
    // Создаем таблицу для отслеживания миграций, если её нет
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Получаем список уже выполненных миграций
    const executedMigrations = await db.query('SELECT name FROM migrations');
    const executedNames = executedMigrations.rows.map(row => row.name);
    
    // Читаем файлы миграций
    const migrationsDir = join(__dirname, '../src/database/migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Сортируем по имени файла
    
    console.log(`📁 Найдено ${migrationFiles.length} файлов миграций`);
    
    let executedCount = 0;
    
    for (const file of migrationFiles) {
      if (executedNames.includes(file)) {
        console.log(`⏭️  Миграция ${file} уже выполнена`);
        continue;
      }
      
      try {
        console.log(`🔄 Выполнение миграции: ${file}`);
        
        const migrationPath = join(migrationsDir, file);
        const migrationSQL = readFileSync(migrationPath, 'utf-8');
        
        // Выполняем миграцию
        await db.query(migrationSQL);
        
        // Отмечаем миграцию как выполненную
        await db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        
        console.log(`✅ Миграция ${file} выполнена успешно`);
        executedCount++;
        
      } catch (error) {
        console.error(`❌ Ошибка выполнения миграции ${file}:`, error);
        throw error;
      }
    }
    
    if (executedCount === 0) {
      console.log('✨ Все миграции уже выполнены');
    } else {
      console.log(`🎉 Выполнено ${executedCount} новых миграций`);
    }
    
  } catch (error) {
    console.error('💥 Ошибка выполнения миграций:', error);
    process.exit(1);
  } finally {
    await db.close();
    console.log('🔌 Соединение с базой данных закрыто');
  }
}

// Запускаем миграции
runMigrations();
