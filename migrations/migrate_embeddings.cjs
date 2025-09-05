// Скрипт для миграции embeddings из JSON в pgvector
const { createClient } = require('@supabase/supabase-js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const proxyAgent = process.env.OPENAI_PROXY_URL ? new HttpsProxyAgent(process.env.OPENAI_PROXY_URL) : null;

async function migrateEmbeddings() {
  console.log('🔄 Начинаем миграцию embeddings...\n');

  try {
    // 1. Получаем все чанки с JSON embeddings
    console.log('📊 Получаем чанки с JSON embeddings...');
    const { data: chunks, error: fetchError } = await supabase
      .from('kb_chunks')
      .select('id, chunk_text, embedding')
      .not('embedding', 'is', null)
      .is('embedding_vec', null); // Только те, у которых нет vector

    if (fetchError) {
      throw new Error(`Ошибка получения чанков: ${fetchError.message}`);
    }

    console.log(`✅ Найдено ${chunks.length} чанков для миграции`);

    if (chunks.length === 0) {
      console.log('✅ Все embeddings уже мигрированы');
      return;
    }

    // 2. Обрабатываем батчами по 100
    const batchSize = 100;
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
        const { error: updateError } = await supabase
          .from('kb_chunks')
          .upsert(updates, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (updateError) {
          console.error(`❌ Ошибка обновления батча: ${updateError.message}`);
        } else {
          processed += updates.length;
          console.log(`✅ Обновлено ${updates.length} чанков`);
        }
      }

      // Небольшая пауза между батчами
      await new Promise(resolve => setTimeout(resolve, 100));
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
