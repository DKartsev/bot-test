const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.ymfduihrjjuzwuckbjjh:mn4c0Je402fgh3mc5@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function testConnection() {
  console.log('🔌 Тестирование подключения к Supabase...');
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Подключение установлено');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Время сервера:', result.rows[0].current_time);
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'users', 'messages')
      ORDER BY table_name;
    `);
    
    console.log('📋 Найденные таблицы:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Код ошибки:', error.code);
  } finally {
    await client.end();
  }
}

testConnection();
