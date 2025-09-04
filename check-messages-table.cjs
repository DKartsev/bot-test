const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.ymfduihrjjuzwuckbjjh:mn4c0Je402fgh3mc5@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function checkMessagesTable() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Подключение к базе данных...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Проверяем структуру таблицы messages
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Структура таблицы messages:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Проверяем структуру таблицы conversations
    const conversationsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Структура таблицы conversations:');
    conversationsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

checkMessagesTable();
