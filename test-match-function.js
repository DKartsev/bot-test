const { createClient } = require('@supabase/supabase-js');

async function testMatchFunction() {
  console.log('🔍 Тестируем функцию match_kb_chunks...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Создаем тестовый embedding (массив из 1536 нулей)
    const testEmbedding = new Array(1536).fill(0);
    
    console.log('📊 Тестовый embedding создан, размер:', testEmbedding.length);
    
    // Пробуем вызвать функцию match_kb_chunks
    const { data, error } = await supabase.rpc('match_kb_chunks', {
      query_embedding: testEmbedding,
      match_count: 5,
      match_threshold: 0.1, // Низкий порог для тестирования
    });
    
    if (error) {
      console.error('❌ Ошибка при вызове match_kb_chunks:', error);
      
      // Проверяем, какие функции доступны
      console.log('🔍 Проверяем доступные функции...');
      const { data: functions, error: functionsError } = await supabase
        .from('pg_proc')
        .select('proname')
        .ilike('proname', '%match%');
      
      if (functionsError) {
        console.error('❌ Ошибка при получении списка функций:', functionsError);
      } else {
        console.log('📋 Функции с "match" в названии:', functions);
      }
    } else {
      console.log('✅ Функция match_kb_chunks работает!');
      console.log('📊 Результаты:', data);
    }
    
  } catch (err) {
    console.error('❌ Общая ошибка:', err.message);
  }
}

testMatchFunction();
