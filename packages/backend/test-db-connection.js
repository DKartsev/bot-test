const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@postgres:5432/support_db'
  });

  try {
    console.log('Тестируем подключение к базе данных...');
    
    const client = await pool.connect();
    console.log('✅ Подключение установлено');
    
    const result = await client.query('SELECT COUNT(*) FROM conversations');
    console.log('✅ Запрос выполнен:', result.rows[0]);
    
    client.release();
    await pool.end();
    
    console.log('✅ Тест завершен успешно');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Детали:', error);
  }
}

testConnection();
