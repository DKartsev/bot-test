const { SupabaseRAGService } = require('./packages/backend/dist/services/supabaseRAGService.js');

async function testRAGService() {
  console.log('🚀 Тестирование RAG сервиса...\n');

  try {
    // Создаем экземпляр сервиса
    const ragService = new SupabaseRAGService();
    
    // Проверяем здоровье сервиса
    console.log('📊 Проверка здоровья сервиса...');
    const healthCheck = await ragService.healthCheck();
    console.log('Результат проверки здоровья:', JSON.stringify(healthCheck, null, 2));
    
    if (healthCheck.status === 'unhealthy') {
      console.log('❌ Сервис нездоров, прерываем тестирование');
      return;
    }
    
    // Тестируем RAG пайплайн
    console.log('\n🔍 Тестирование RAG пайплайна...');
    const testQuery = 'как открыть сделку';
    
    const testResult = await ragService.testPipeline(testQuery);
    
    if (testResult.success) {
      console.log('✅ RAG пайплайн работает!');
      console.log('📝 Ответ:', testResult.response.answer);
      console.log('📊 Уверенность:', (testResult.response.confidence * 100).toFixed(1) + '%');
      console.log('🔍 Найдено источников:', testResult.response.sources.length);
      console.log('⏱️ Время обработки:', testResult.response.totalTime + 'ms');
      
      if (testResult.response.sources.length > 0) {
        console.log('\n📚 Источники:');
        testResult.response.sources.forEach((source, index) => {
          console.log(`${index + 1}. ${source.title} (similarity: ${source.score.toFixed(3)})`);
          console.log(`   ${source.content.substring(0, 100)}...`);
        });
      }
    } else {
      console.log('❌ Ошибка RAG пайплайна:', testResult.error);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Запускаем тест
testRAGService().catch(console.error);
