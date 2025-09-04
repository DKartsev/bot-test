const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.ymfduihrjjuzwuckbjjh:mn4c0Je402fgh3mc5@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function testConnection() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Подключение к базе данных из контейнера...');
    await client.connect();
    console.log('✅ Подключение работает');

    // Проверяем таблицу conversations
    const result = await client.query('SELECT COUNT(*) as count FROM conversations;');
    console.log(`💬 Чатов в таблице conversations: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();
