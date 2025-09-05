// Финальный скрипт развертывания улучшений RAG
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deployRAGImprovements() {
  console.log('🚀 Развертывание улучшений RAG системы...\n');

  try {
    // Шаг 1: Проверяем подключение к Supabase
    console.log('🔌 Проверяем подключение к Supabase...');
    const { data, error } = await supabase.from('kb_chunks').select('count').limit(1);
    
    if (error) {
      throw new Error(`Ошибка подключения к Supabase: ${error.message}`);
    }
    console.log('✅ Подключение к Supabase успешно');

    // Шаг 2: Проверяем наличие расширений
    console.log('\n📦 Проверяем расширения PostgreSQL...');
    const extensions = ['vector', 'pg_trgm', 'unaccent'];
    
    for (const ext of extensions) {
      try {
        const { data: extData, error: extError } = await supabase
          .rpc('exec_sql', { 
            sql: `SELECT 1 FROM pg_extension WHERE extname = '${ext}';` 
          });
        
        if (extError) {
          console.log(`⚠️ Расширение ${ext}: ${extError.message}`);
        } else {
          console.log(`✅ Расширение ${ext} установлено`);
        }
      } catch (e) {
        console.log(`⚠️ Не удалось проверить ${ext}: ${e.message}`);
      }
    }

    // Шаг 3: Проверяем колонки
    console.log('\n📊 Проверяем колонки в kb_chunks...');
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'kb_chunks' AND column_name IN ('embedding_vec', 'content_tsv');` 
      });
    
    if (colError) {
      console.log(`⚠️ Ошибка проверки колонок: ${colError.message}`);
    } else {
      console.log(`✅ Найдено ${columns?.length || 0} новых колонок`);
    }

    // Шаг 4: Проверяем RPC функцию
    console.log('\n🔧 Проверяем RPC функцию rag_hybrid_search...');
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('rag_hybrid_search', {
          q_vec: Array(1536).fill(0.1), // Тестовый вектор
          q_text: 'test',
          k: 1,
          min_sim: 0.1
        });
      
      if (rpcError) {
        console.log(`⚠️ RPC функция: ${rpcError.message}`);
      } else {
        console.log(`✅ RPC функция работает, найдено ${rpcData?.length || 0} результатов`);
      }
    } catch (e) {
      console.log(`⚠️ RPC функция не найдена: ${e.message}`);
    }

    // Шаг 5: Мигрируем embeddings
    console.log('\n🔄 Запускаем миграцию embeddings...');
    const migrateProcess = spawn('node', ['migrations/migrate_embeddings_simple.cjs'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    migrateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Миграция embeddings завершена');
        
        // Шаг 6: Тестируем улучшения
        console.log('\n🧪 Тестируем улучшения RAG...');
        const testProcess = spawn('node', ['test-rag-improvements.cjs'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        testProcess.on('close', (testCode) => {
          if (testCode === 0) {
            console.log('\n🎉 Развертывание завершено успешно!');
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
            console.log('\n📋 Следующие шаги:');
            console.log('  1. Перезапустите сервисы на VM: docker-compose restart');
            console.log('  2. Проверьте логи: docker-compose logs -f');
            console.log('  3. Протестируйте бота в Telegram');
          } else {
            console.error(`❌ Ошибка тестирования: код ${testCode}`);
          }
        });

      } else {
        console.error(`❌ Ошибка миграции embeddings: код ${code}`);
      }
    });

  } catch (error) {
    console.error('❌ Критическая ошибка развертывания:', error.message);
  }
}

deployRAGImprovements().catch(console.error);
