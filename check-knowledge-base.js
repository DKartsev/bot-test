const { createClient } = require('@supabase/supabase-js');

async function checkKnowledgeBase() {
  console.log('🔍 Проверяем базу знаний...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Проверяем таблицу kb_chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('kb_chunks')
      .select('*')
      .limit(5);
    
    if (chunksError) {
      console.error('❌ Ошибка при получении kb_chunks:', chunksError);
    } else {
      console.log('📊 Найдено чанков в kb_chunks:', chunks.length);
      chunks.forEach((chunk, i) => {
        console.log(`${i+1}. ID: ${chunk.id}`);
        console.log(`   Article ID: ${chunk.article_id}`);
        console.log(`   Chunk Index: ${chunk.chunk_index}`);
        console.log(`   Chunk Text: ${chunk.chunk_text ? chunk.chunk_text.substring(0, 100) : 'N/A'}...`);
        console.log('');
      });
    }
    
    // Проверяем таблицу kb_articles
    const { data: articles, error: articlesError } = await supabase
      .from('kb_articles')
      .select('*')
      .limit(5);
    
    if (articlesError) {
      console.error('❌ Ошибка при получении kb_articles:', articlesError);
    } else {
      console.log('📊 Найдено статей в kb_articles:', articles.length);
      articles.forEach((article, i) => {
        console.log(`${i+1}. ID: ${article.id}`);
        console.log(`   Title: ${article.title || 'N/A'}`);
        console.log(`   Content: ${article.content ? article.content.substring(0, 100) : 'N/A'}...`);
        console.log('');
      });
    }
    
    // Проверяем все таблицы
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ Ошибка при получении списка таблиц:', tablesError);
    } else {
      console.log('📋 Доступные таблицы:');
      tables.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Общая ошибка:', err.message);
  }
}

checkKnowledgeBase();
