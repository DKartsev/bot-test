const { createClient } = require('@supabase/supabase-js');

async function checkEmbeddings() {
  console.log('🔍 Проверяем embeddings в kb_chunks...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Проверяем структуру таблицы kb_chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('kb_chunks')
      .select('*')
      .limit(3);
    
    if (chunksError) {
      console.error('❌ Ошибка при получении kb_chunks:', chunksError);
      return;
    }
    
    console.log('📊 Найдено чанков:', chunks.length);
    
    chunks.forEach((chunk, i) => {
      console.log(`\n${i+1}. Чанк ID: ${chunk.id}`);
      console.log(`   Article ID: ${chunk.article_id}`);
      console.log(`   Chunk Index: ${chunk.chunk_index}`);
      console.log(`   Chunk Text: ${chunk.chunk_text ? chunk.chunk_text.substring(0, 100) : 'N/A'}...`);
      
      // Проверяем наличие embedding
      if (chunk.embedding) {
        console.log(`   Embedding: есть, размер: ${chunk.embedding.length}`);
        console.log(`   Тип: ${typeof chunk.embedding}`);
        
        // Проверяем, является ли embedding массивом
        if (Array.isArray(chunk.embedding)) {
          console.log(`   Первые 5 значений: [${chunk.embedding.slice(0, 5).join(', ')}]`);
        } else {
          console.log(`   Первые 50 символов: ${chunk.embedding.substring(0, 50)}...`);
          
          // Пробуем распарсить как JSON
          try {
            const parsed = JSON.parse(chunk.embedding);
            if (Array.isArray(parsed)) {
              console.log(`   Parsed как JSON массив, размер: ${parsed.length}`);
              console.log(`   Первые 5 значений: [${parsed.slice(0, 5).join(', ')}]`);
            }
          } catch (e) {
            console.log(`   Не удалось распарсить как JSON`);
          }
        }
      } else {
        console.log(`   Embedding: ОТСУТСТВУЕТ!`);
      }
    });
    
    // Проверяем, есть ли колонка embedding
    console.log('\n🔍 Проверяем структуру таблицы...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'kb_chunks')
      .eq('table_schema', 'public');
    
    if (columnsError) {
      console.error('❌ Ошибка при получении структуры таблицы:', columnsError);
    } else {
      console.log('📋 Колонки в kb_chunks:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Общая ошибка:', err.message);
  }
}

checkEmbeddings();
