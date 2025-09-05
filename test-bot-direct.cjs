// Загружаем переменные окружения
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const OpenAI = require('openai');

async function testBotDirect() {
  console.log('🤖 Тестируем бота напрямую...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    httpAgent: process.env.OPENAI_PROXY_URL ? new HttpsProxyAgent(process.env.OPENAI_PROXY_URL) : undefined,
  });
  
  try {
    // Тестируем поиск в базе знаний
    console.log('📊 Тестируем поиск в базе знаний...');
    
    const testQuery = "как открыть сделку";
    console.log(`🔍 Тестовый запрос: "${testQuery}"`);
    
    // Создаем embedding для тестового запроса
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: testQuery,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`📊 Embedding создан, размер: ${queryEmbedding.length}`);
    
    // Выполняем поиск в базе знаний
    const { data: chunks, error: chunksError } = await supabase
      .from('kb_chunks')
      .select(`
        id,
        article_id,
        chunk_index,
        chunk_text,
        embedding
      `)
      .not('embedding', 'is', null)
      .limit(10);
    
    if (chunksError) {
      throw new Error(`Supabase ошибка: ${chunksError.message}`);
    }
    
    console.log(`📊 Найдено чанков с embeddings: ${chunks.length}`);
    
    if (chunks.length === 0) {
      console.log('❌ Нет чанков с embeddings в базе знаний');
      return;
    }
    
    // Вычисляем similarity для каждого чанка
    const resultsWithSimilarity = chunks.map(chunk => {
      let similarity = 0;
      
      try {
        // Парсим embedding из JSON строки
        const chunkEmbedding = typeof chunk.embedding === 'string' 
          ? JSON.parse(chunk.embedding) 
          : chunk.embedding;
        
        if (Array.isArray(chunkEmbedding) && chunkEmbedding.length === queryEmbedding.length) {
          // Вычисляем cosine similarity
          const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * chunkEmbedding[i], 0);
          const queryNorm = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
          const chunkNorm = Math.sqrt(chunkEmbedding.reduce((sum, val) => sum + val * val, 0));
          
          if (queryNorm > 0 && chunkNorm > 0) {
            similarity = dotProduct / (queryNorm * chunkNorm);
          }
        }
      } catch (e) {
        console.log(`⚠️ Ошибка парсинга embedding для чанка ${chunk.id}: ${e.message}`);
      }
      
      return {
        ...chunk,
        similarity
      };
    });
    
    // Сортируем по similarity
    const sortedResults = resultsWithSimilarity
      .sort((a, b) => b.similarity - a.similarity);
    
    console.log('\n📋 Результаты поиска:');
    sortedResults.forEach((result, i) => {
      console.log(`\n${i+1}. Чанк ID: ${result.id}`);
      console.log(`   Similarity: ${result.similarity.toFixed(4)}`);
      console.log(`   Текст: ${result.chunk_text ? result.chunk_text.substring(0, 100) : 'N/A'}...`);
    });
    
    // Тестируем генерацию ответа с низким порогом
    console.log('\n🤖 Тестируем генерацию ответа с низким порогом...');
    
    const contextChunks = sortedResults.slice(0, 3).map(r => r.chunk_text);
    const prompt = `Контекст:\n${contextChunks.join('\n\n')}\n\nВопрос: ${testQuery}\n\nОтвет:`;
    
    console.log('📝 Промпт для генерации:');
    console.log(prompt.substring(0, 200) + '...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Ты - помощник службы поддержки. Отвечай ТОЛЬКО на основе предоставленных источников. Если информации недостаточно, скажи об этом." 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });
    
    console.log('\n✅ Ответ сгенерирован:');
    console.log(response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании бота:', error.message);
  }
}

testBotDirect();
