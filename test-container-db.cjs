const { Client } = require('pg');

async function testConnection() {
  console.log('🔌 Тестирование подключения из контейнера...');
  
  const connectionString = process.env.DATABASE_URL;
  console.log('📡 DATABASE_URL:', connectionString?.substring(0, 50) + '...');
  
  const isSupabase = connectionString?.includes('supabase.com');
  console.log('🔍 Is Supabase:', isSupabase);
  
  const sslConfig = isSupabase ? { rejectUnauthorized: false } : false;
  console.log('🔒 SSL Config:', sslConfig);
  
  const client = new Client({
    connectionString,
    ssl: sslConfig
  });

  try {
    await client.connect();
    console.log('✅ Подключение установлено');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Время сервера:', result.rows[0].current_time);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Код ошибки:', error.code);
  } finally {
    await client.end();
  }
}

testConnection();
