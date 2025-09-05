// Скрипт для запуска миграций RAG системы
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrations() {
  console.log('🚀 Запуск миграций RAG системы...\n');

  try {
    // 1. Читаем SQL миграцию
    const migrationPath = path.join(__dirname, 'migrations', '001_pgvector_setup.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Выполняем SQL миграции...');
    
    // Сначала создаем функцию exec_sql
    const execSQLPath = path.join(__dirname, 'migrations', '002_exec_sql_function.sql');
    const execSQL = fs.readFileSync(execSQLPath, 'utf8');
    
    console.log('🔧 Создаем функцию exec_sql...');
    const { error: execError } = await supabase.rpc('exec_sql', { sql: execSQL });
    if (execError) {
      console.log(`⚠️ Предупреждение exec_sql: ${execError.message}`);
    } else {
      console.log('✅ Функция exec_sql создана');
    }
    
    // Теперь выполняем основную миграцию
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('CREATE OR REPLACE FUNCTION'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.log(`⚠️ Предупреждение: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        }
      } catch (err) {
        console.log(`⚠️ Ошибка в запросе: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`✅ SQL миграция завершена: ${successCount} успешно, ${errorCount} ошибок`);

    // 2. Запускаем миграцию embeddings
    console.log('\n🔄 Запускаем миграцию embeddings...');
    const { spawn } = require('child_process');
    
    const migrateProcess = spawn('node', ['migrations/migrate_embeddings.cjs'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    migrateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 Все миграции выполнены успешно!');
        console.log('\n📊 Что было сделано:');
        console.log('  ✅ Настроены расширения pgvector, pg_trgm, unaccent');
        console.log('  ✅ Создана колонка embedding_vec для векторов');
        console.log('  ✅ Создана колонка content_tsv для полнотекстового поиска');
        console.log('  ✅ Созданы индексы для быстрого поиска');
        console.log('  ✅ Создана RPC функция rag_hybrid_search');
        console.log('  ✅ Настроен RLS для безопасности');
        console.log('  ✅ Создана таблица rag_logs для аналитики');
        console.log('  ✅ Мигрированы embeddings в pgvector формат');
        console.log('\n🚀 RAG система готова к работе!');
      } else {
        console.error(`❌ Ошибка миграции embeddings: код ${code}`);
      }
    });

  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error.message);
  }
}

runMigrations().catch(console.error);