#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseDiagnostics {
  constructor() {
    this.client = null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    // Пытаемся загрузить конфигурацию из разных источников
    const configSources = [
      process.env.DATABASE_URL,
      process.env.SUPABASE_URL ? this.buildSupabaseUrl() : null,
      this.loadFromFile('.env'),
      this.loadFromFile('docker.env'),
      this.loadFromFile('packages/backend/.env')
    ].filter(Boolean);

    if (configSources.length === 0) {
      console.log('❌ Не найдена конфигурация БД. Создайте файл .env с переменной DATABASE_URL');
      return null;
    }

    const config = configSources[0];
    console.log('📋 Конфигурация БД загружена');
    return config;
  }

  buildSupabaseUrl() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (url && key) {
      return url.replace('https://', 'postgresql://postgres:' + key + '@') + ':5432/postgres';
    }
    return null;
  }

  loadFromFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/DATABASE_URL=(.+)/);
        if (match) {
          return match[1].trim();
        }
      }
    } catch (error) {
      // Игнорируем ошибки чтения файлов
    }
    return null;
  }

  async connect() {
    if (!this.config) {
      throw new Error('Конфигурация БД не найдена');
    }

    try {
      this.client = new Client({
        connectionString: this.config,
        ssl: this.config.includes('supabase') ? { rejectUnauthorized: false } : false
      });

      await this.client.connect();
      console.log('✅ Подключение к БД установлено');
      return true;
    } catch (error) {
      console.error('❌ Ошибка подключения к БД:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 Соединение с БД закрыто');
    }
  }

  async getDatabaseInfo() {
    try {
      console.log('\n📊 ИНФОРМАЦИЯ О БД:');
      console.log('='.repeat(50));

      // Версия PostgreSQL
      const versionResult = await this.client.query('SELECT version()');
      console.log('PostgreSQL версия:', versionResult.rows[0].version);

      // Список схем
      const schemasResult = await this.client.query(`
        SELECT schema_name, schema_owner 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name
      `);
      
      console.log('\n📁 Схемы БД:');
      schemasResult.rows.forEach(row => {
        console.log(`  - ${row.schema_name} (владелец: ${row.schema_owner})`);
      });

      // Размер БД
      const sizeResult = await this.client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
      `);
      console.log('\n💾 Размер БД:', sizeResult.rows[0].db_size);

    } catch (error) {
      console.error('❌ Ошибка получения информации о БД:', error.message);
    }
  }

  async getTablesInfo(schema = 'public') {
    try {
      console.log(`\n🗂️  ТАБЛИЦЫ В СХЕМЕ '${schema}':`);
      console.log('='.repeat(50));

      const tablesResult = await this.client.query(`
        SELECT 
          table_name,
          table_type,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_schema AND table_name = t.table_name) as columns_count
        FROM information_schema.tables t
        WHERE table_schema = $1
        ORDER BY table_name
      `, [schema]);

      if (tablesResult.rows.length === 0) {
        console.log(`  Нет таблиц в схеме '${schema}'`);
        return;
      }

      tablesResult.rows.forEach(row => {
        console.log(`  📋 ${row.table_name} (${row.table_type}, колонок: ${row.columns_count})`);
      });

    } catch (error) {
      console.error('❌ Ошибка получения информации о таблицах:', error.message);
    }
  }

  async getTableStructure(tableName, schema = 'public') {
    try {
      console.log(`\n🔍 СТРУКТУРА ТАБЛИЦЫ '${schema}.${tableName}':`);
      console.log('='.repeat(50));

      const columnsResult = await this.client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [schema, tableName]);

      if (columnsResult.rows.length === 0) {
        console.log(`  Таблица '${schema}.${tableName}' не найдена`);
        return;
      }

      console.log('  Колонки:');
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`    - ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultValue}`);
      });

      // Индексы
      const indexesResult = await this.client.query(`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = $1 AND tablename = $2
        ORDER BY indexname
      `, [schema, tableName]);

      if (indexesResult.rows.length > 0) {
        console.log('\n  🔑 Индексы:');
        indexesResult.rows.forEach(idx => {
          console.log(`    - ${idx.indexname}: ${idx.indexdef}`);
        });
      }

    } catch (error) {
      console.error('❌ Ошибка получения структуры таблицы:', error.message);
    }
  }

  async getTableData(tableName, schema = 'public', limit = 5) {
    try {
      console.log(`\n📊 ДАННЫЕ ТАБЛИЦЫ '${schema}.${tableName}' (первые ${limit} записей):`);
      console.log('='.repeat(50));

      const countResult = await this.client.query(`
        SELECT COUNT(*) as total_count
        FROM ${schema}.${tableName}
      `);
      
      const totalCount = countResult.rows[0].total_count;
      console.log(`  Всего записей: ${totalCount}`);

      if (totalCount === 0) {
        console.log('  Таблица пуста');
        return;
      }

      const dataResult = await this.client.query(`
        SELECT * FROM ${schema}.${tableName}
        ORDER BY created_at DESC, id DESC
        LIMIT $1
      `, [limit]);

      console.log('\n  Примеры данных:');
      dataResult.rows.forEach((row, index) => {
        console.log(`\n  Запись ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          const displayValue = value === null ? 'NULL' : 
                             typeof value === 'string' && value.length > 100 ? 
                             value.substring(0, 100) + '...' : value;
          console.log(`    ${key}: ${displayValue}`);
        });
      });

    } catch (error) {
      console.error('❌ Ошибка получения данных таблицы:', error.message);
    }
  }

  async getSupportSchemaInfo() {
    try {
      console.log('\n🎯 ИНФОРМАЦИЯ О СХЕМЕ SUPPORT:');
      console.log('='.repeat(50));

      // Проверяем существование схемы support
      const schemaExists = await this.client.query(`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.schemata 
          WHERE schema_name = 'support'
        )
      `);

      if (!schemaExists.rows[0].exists) {
        console.log('  ❌ Схема "support" не найдена');
        return;
      }

      console.log('  ✅ Схема "support" существует');

      // Получаем таблицы в схеме support
      await this.getTablesInfo('support');

      // Проверяем ключевые таблицы
      const keyTables = ['chats', 'messages', 'users', 'operators'];
      for (const table of keyTables) {
        try {
          const exists = await this.client.query(`
            SELECT EXISTS(
              SELECT 1 FROM information_schema.tables 
              WHERE table_schema = 'support' AND table_name = $1
            )
          `, [table]);

          if (exists.rows[0].exists) {
            const count = await this.client.query(`SELECT COUNT(*) FROM support.${table}`);
            console.log(`  📊 ${table}: ${count.rows[0].count} записей`);
          } else {
            console.log(`  ❌ ${table}: таблица не найдена`);
          }
        } catch (error) {
          console.log(`  ⚠️  ${table}: ошибка проверки`);
        }
      }

    } catch (error) {
      console.error('❌ Ошибка получения информации о схеме support:', error.message);
    }
  }

  async runDiagnostics() {
    try {
      console.log('🚀 Запуск диагностики БД...\n');

      if (!await this.connect()) {
        return;
      }

      // Базовая информация
      await this.getDatabaseInfo();

      // Информация о схеме support
      await this.getSupportSchemaInfo();

      // Структура ключевых таблиц
      const keyTables = ['chats', 'messages', 'users', 'operators'];
      for (const table of keyTables) {
        try {
          await this.getTableStructure(table, 'support');
          await this.getTableData(table, 'support', 3);
        } catch (error) {
          console.log(`  ⚠️  Пропускаем таблицу ${table} из-за ошибки`);
        }
      }

      console.log('\n✅ Диагностика завершена');

    } catch (error) {
      console.error('❌ Критическая ошибка:', error.message);
    } finally {
      await this.disconnect();
    }
  }

  async runCustomQuery(query, params = []) {
    try {
      if (!await this.connect()) {
        return;
      }

      console.log(`\n🔍 ВЫПОЛНЕНИЕ ЗАПРОСА:`);
      console.log('='.repeat(50));
      console.log('SQL:', query);
      if (params.length > 0) {
        console.log('Параметры:', params);
      }
      console.log('='.repeat(50));

      const result = await this.client.query(query, params);
      
      console.log(`\n📊 Результат (${result.rows.length} записей):`);
      if (result.rows.length > 0) {
        console.table(result.rows);
      } else {
        console.log('  Нет данных');
      }

    } catch (error) {
      console.error('❌ Ошибка выполнения запроса:', error.message);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI интерфейс
async function main() {
  const args = process.argv.slice(2);
  const diagnostics = new DatabaseDiagnostics();

  if (args.length === 0) {
    // Запуск полной диагностики
    await diagnostics.runDiagnostics();
  } else if (args[0] === 'query' && args[1]) {
    // Выполнение кастомного запроса
    const query = args[1];
    const params = args.slice(2);
    await diagnostics.runCustomQuery(query, params);
  } else if (args[0] === 'tables') {
    // Показать таблицы
    if (await diagnostics.connect()) {
      await diagnostics.getTablesInfo('support');
      await diagnostics.disconnect();
    }
  } else if (args[0] === 'structure' && args[1]) {
    // Показать структуру таблицы
    if (await diagnostics.connect()) {
      await diagnostics.getTableStructure(args[1], 'support');
      await diagnostics.disconnect();
    }
  } else if (args[0] === 'data' && args[1]) {
    // Показать данные таблицы
    if (await diagnostics.connect()) {
      await diagnostics.getTableData(args[1], 'support', 10);
      await diagnostics.disconnect();
    }
  } else {
    console.log(`
📋 ИСПОЛЬЗОВАНИЕ СКРИПТА ДИАГНОСТИКИ БД:

  node tools/db-diagnostics.js                    # Полная диагностика
  node tools/db-diagnostics.js tables            # Показать таблицы в схеме support
  node tools/db-diagnostics.js structure chats   # Структура таблицы chats
  node tools/db-diagnostics.js data chats        # Данные таблицы chats (10 записей)
  node tools/db-diagnostics.js query "SELECT * FROM support.chats LIMIT 5"  # Кастомный запрос

🔧 НАСТРОЙКА:
  Создайте файл .env в корне проекта с переменной:
  DATABASE_URL=postgresql://user:password@host:port/database

  Или используйте переменные окружения:
  - SUPABASE_URL и SUPABASE_KEY для Supabase
  - DATABASE_URL для прямого подключения к PostgreSQL
    `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseDiagnostics;
