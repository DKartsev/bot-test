const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.ymfduihrjjuzwuckbjjh:mn4c0Je402fgh3mc5@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function testConnection() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Подключение к базе данных...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Проверяем таблицы
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Найденные таблицы:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Проверяем таблицу users
    const usersResult = await client.query(`
      SELECT COUNT(*) as count FROM users;
    `);
    console.log(`👥 Пользователей в таблице users: ${usersResult.rows[0].count}`);

    // Проверяем таблицу chats
    const chatsResult = await client.query(`
      SELECT COUNT(*) as count FROM chats;
    `);
    console.log(`💬 Чатов в таблице chats: ${chatsResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();
