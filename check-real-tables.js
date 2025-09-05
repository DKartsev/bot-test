const { createClient } = require('@supabase/supabase-js');

async function checkRealTables() {
  console.log('🔍 Проверяем реальные таблицы в базе данных...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Пробуем получить список таблиц через SQL запрос
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT table_name, table_schema 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `
      });
    
    if (tablesError) {
      console.error('❌ Ошибка при получении списка таблиц через exec_sql:', tablesError);
      
      // Пробуем другой способ - через pg_tables
      const { data: pgTables, error: pgTablesError } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT tablename, schemaname 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename;
          `
        });
      
      if (pgTablesError) {
        console.error('❌ Ошибка при получении списка таблиц через pg_tables:', pgTablesError);
        
        // Пробуем напрямую через Supabase API
        console.log('🔍 Пробуем получить таблицы через Supabase API...');
        
        // Проверяем известные таблицы
        const knownTables = ['kb_chunks', 'kb_articles', 'users', 'chats', 'conversations', 'messages'];
        
        for (const tableName of knownTables) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (error) {
              console.log(`❌ Таблица ${tableName}: ${error.message}`);
            } else {
              console.log(`✅ Таблица ${tableName}: существует, записей: ${data ? data.length : 0}`);
            }
          } catch (err) {
            console.log(`❌ Таблица ${tableName}: ${err.message}`);
          }
        }
      } else {
        console.log('📋 Таблицы в базе данных:');
        pgTables.forEach(table => {
          console.log(`   - ${table.tablename} (schema: ${table.schemaname})`);
        });
      }
    } else {
      console.log('📋 Таблицы в базе данных:');
      tables.forEach(table => {
        console.log(`   - ${table.table_name} (schema: ${table.table_schema})`);
      });
    }
    
  } catch (err) {
    console.error('❌ Общая ошибка:', err.message);
  }
}

checkRealTables();
