// Простой тест RAG сервиса без компиляции
const { createClient } = require('@supabase/supabase-js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');

// Загружаем переменные окружения
require('dotenv').config();

// Переменные окружения
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_PROXY_URL = process.env.OPENAI_PROXY_URL || 'http://aUGIll6zoH:KFu2uvbHBx@193.233.115.178:11403';

async function testRAGService() {
  console.log('🚀 Тестирование RAG сервиса...\n');

  try {
    // Инициализация Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('✅ Supabase клиент инициализирован');

    // Настройка прокси для OpenAI
    const proxyAgent = new HttpsProxyAgent(OPENAI_PROXY_URL);
    console.log('✅ HTTP прокси настроен');

    // Тест 1: Проверка подключения к Supabase
    console.log('\n📊 Тест 1: Проверка подключения к Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('kb_chunks')
      .select('id, chunk_text')
      .limit(1);

    if (testError) {
      console.log('❌ Ошибка подключения к Supabase:', testError.message);
      return;
    }
    console.log('✅ Подключение к Supabase работает');

    // Тест 2: Проверка OpenAI API
    console.log('\n🤖 Тест 2: Проверка OpenAI API...');
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        agent: proxyAgent,
      });

      if (response.ok) {
        console.log('✅ OpenAI API доступен');
      } else {
        console.log('❌ OpenAI API недоступен:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ Ошибка подключения к OpenAI:', error.message);
    }

    // Тест 3: Создание embeddings
    console.log('\n🔮 Тест 3: Создание embeddings...');
    const testQuestion = 'как открыть сделку';
    
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: testQuestion,
        }),
        agent: proxyAgent,
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0]?.embedding;
        console.log('✅ Embeddings созданы, размерность:', embedding?.length);
        
        // Тест 4: Поиск в базе знаний
        console.log('\n🔍 Тест 4: Поиск в базе знаний...');
        const { data: chunks, error: chunksError } = await supabase
          .from('kb_chunks')
          .select('id, chunk_text, embedding, chunk_index, article_id')
          .not('embedding', 'is', null)
          .limit(10);

        if (chunksError) {
          console.log('❌ Ошибка поиска в базе знаний:', chunksError.message);
          return;
        }

        console.log('✅ Найдено чанков с embeddings:', chunks.length);

        if (chunks.length > 0) {
          // Вычисляем similarity для первого чанка
          const firstChunk = chunks[0];
          let similarity = 0;
          
          try {
            const chunkEmbedding = typeof firstChunk.embedding === 'string' 
              ? JSON.parse(firstChunk.embedding) 
              : firstChunk.embedding;
            
            if (Array.isArray(chunkEmbedding) && chunkEmbedding.length === embedding.length) {
              const dotProduct = embedding.reduce((sum, val, i) => sum + val * chunkEmbedding[i], 0);
              const queryNorm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
              const chunkNorm = Math.sqrt(chunkEmbedding.reduce((sum, val) => sum + val * val, 0));
              
              if (queryNorm > 0 && chunkNorm > 0) {
                similarity = dotProduct / (queryNorm * chunkNorm);
              }
            }
          } catch (e) {
            console.log('⚠️ Ошибка парсинга embedding:', e.message);
          }

          console.log('📊 Similarity с первым чанком:', similarity.toFixed(3));
          console.log('📝 Текст первого чанка:', firstChunk.chunk_text.substring(0, 100) + '...');
        }

      } else {
        console.log('❌ Ошибка создания embeddings:', embeddingResponse.status, embeddingResponse.statusText);
      }
    } catch (error) {
      console.log('❌ Ошибка при создании embeddings:', error.message);
    }

    console.log('\n✅ Тестирование завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

// Запускаем тест
testRAGService().catch(console.error);
