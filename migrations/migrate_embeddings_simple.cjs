// Упрощенная миграция embeddings без прокси
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateEmbeddings() {
  console.log('🔄 Начинаем миграцию embeddings...\n');

  try {
    // 1. Получаем все чанки с JSON embeddings
    console.log('📊 Получаем чанки с JSON embeddings...');
    const { data: chunks, error: fetchError } = await supabase
      .from('kb_chunks')
      .select('*') // Получаем все колонки
      .not('embedding', 'is', null)
      .not('article_id', 'is', null) // Исключаем записи без article_id
      .not('chunk_index', 'is', null) // Исключаем записи без chunk_index
      .is('embedding_vec', null); // Только те, у которых нет vector

    if (fetchError) {
      throw new Error(`Ошибка получения чанков: ${fetchError.message}`);
    }

    console.log(`✅ Найдено ${chunks.length} чанков для миграции`);

    if (chunks.length === 0) {
      console.log('✅ Все embeddings уже мигрированы');
      return;
    }

    // 2. Обрабатываем батчами по 50
    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`\n📦 Обрабатываем батч ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);

      const updates = [];

      for (const chunk of batch) {
        try {
          // Парсим JSON embedding
          let embedding;
          if (typeof chunk.embedding === 'string') {
            embedding = JSON.parse(chunk.embedding);
          } else {
            embedding = chunk.embedding;
          }

          if (!Array.isArray(embedding) || embedding.length !== 1536) {
            console.warn(`⚠️ Неверный формат embedding для чанка ${chunk.id}`);
            continue;
          }

          // Нормализуем вектор (L2 normalization)
          const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
          const normalizedEmbedding = embedding.map(val => val / norm);

          updates.push({
            id: chunk.id,
            embedding_vec: `[${normalizedEmbedding.join(',')}]`
          });

        } catch (error) {
          console.warn(`⚠️ Ошибка обработки чанка ${chunk.id}: ${error.message}`);
        }
      }

      // 3. Обновляем батч в Supabase
      if (updates.length > 0) {
        // Обновляем по одному для безопасности
        let batchProcessed = 0;
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('kb_chunks')
            .update({ embedding_vec: update.embedding_vec })
            .eq('id', update.id);

          if (updateError) {
            console.error(`❌ Ошибка обновления чанка ${update.id}: ${updateError.message}`);
          } else {
            batchProcessed++;
          }
        }
        
        processed += batchProcessed;
        console.log(`✅ Обновлено ${batchProcessed} чанков из ${updates.length}`);
      }

      // Пауза между батчами
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n🎉 Миграция завершена! Обработано ${processed} чанков`);

    // 4. Проверяем результат
    const { data: checkData, error: checkError } = await supabase
      .from('kb_chunks')
      .select('id')
      .not('embedding_vec', 'is', null)
      .limit(1);

    if (checkError) {
      console.error('❌ Ошибка проверки:', checkError.message);
    } else {
      console.log('✅ Проверка прошла успешно - vector embeddings созданы');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error.message);
  }
}

// Запускаем миграцию
migrateEmbeddings().catch(console.error);
