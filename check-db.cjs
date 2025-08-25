const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function checkTables() {
  try {
    // Проверяем структуру таблицы messages
    console.log('🔍 Проверяем структуру таблицы messages...');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      ORDER BY ordinal_position
    `);
    console.log('Колонки таблицы messages:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Проверяем количество сообщений
    const messagesResult = await pool.query('SELECT COUNT(*) as count FROM messages');
    console.log(`\nКоличество сообщений: ${messagesResult.rows[0].count}`);
    
    if (parseInt(messagesResult.rows[0].count) > 0) {
      const sampleMessages = await pool.query('SELECT * FROM messages LIMIT 1');
      console.log('Пример сообщения:');
      console.log(JSON.stringify(sampleMessages.rows[0], null, 2));
    }
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
}

checkTables();
