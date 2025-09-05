// Тест улучшенного RAG сервиса
const { SupabaseRAGService } = require('./packages/backend/dist/services/supabaseRAGService.js');

require('dotenv').config();

async function testRAGImprovements() {
  console.log('🚀 Тестирование улучшенного RAG сервиса...\n');

  try {
    const ragService = new SupabaseRAGService();
    
    // Тестовые вопросы
    const testQuestions = [
      'как открыть сделку',
      'какие есть способы пополнения счета',
      'как связаться с поддержкой',
      'что такое стоп-лосс',
      'как настроить уведомления'
    ];

    for (const question of testQuestions) {
      console.log(`\n🔍 Тестируем вопрос: "${question}"`);
      console.log('─'.repeat(60));

      const startTime = Date.now();
      
      const result = await ragService.testPipeline(question);
      
      const totalTime = Date.now() - startTime;

      if (result.success) {
        console.log('✅ Успешно обработан');
        console.log(`📝 Ответ: ${result.response.answer.substring(0, 200)}...`);
        console.log(`📊 Уверенность: ${(result.response.confidence * 100).toFixed(1)}%`);
        console.log(`🔍 Найдено источников: ${result.response.sources.length}`);
        console.log(`⏱️ Время обработки: ${totalTime}ms`);
        
        if (result.response.sources.length > 0) {
          console.log('\n📚 Топ-3 источника:');
          result.response.sources.slice(0, 3).forEach((source, i) => {
            console.log(`  ${i+1}. Similarity: ${source.score.toFixed(3)} | ${source.content.substring(0, 80)}...`);
          });
        }
      } else {
        console.log('❌ Ошибка:', result.error);
      }

      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 Тестирование завершено!');
    
    // Проверяем логи в базе данных
    console.log('\n📊 Проверяем логи RAG запросов...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: logs, error } = await supabase
      .from('rag_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('⚠️ Ошибка получения логов:', error.message);
    } else {
      console.log(`📈 Найдено ${logs.length} записей в логах:`);
      logs.forEach((log, i) => {
        console.log(`  ${i+1}. ${log.question_text?.substring(0, 50)}... | ${log.total_time_ms}ms | ${(log.confidence * 100).toFixed(1)}%`);
      });
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

testRAGImprovements().catch(console.error);
