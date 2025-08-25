const { db } = require('./packages/backend/dist/database/connection');

async function checkDatabase() {
  try {
    console.log('🔍 Проверяем структуру базы данных...');
    
    // Проверяем таблицы
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Найденные таблицы:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Проверяем таблицу operators
    if (tablesResult.rows.some(r => r.table_name === 'operators')) {
      console.log('\n👥 Проверяем таблицу operators...');
      const operatorsResult = await db.query('SELECT COUNT(*) as count FROM operators');
      console.log(`  Количество операторов: ${operatorsResult.rows[0].count}`);
      
      if (parseInt(operatorsResult.rows[0].count) > 0) {
        const operators = await db.query('SELECT id, name, email, role, is_active FROM operators LIMIT 5');
        console.log('  Первые операторы:');
        operators.rows.forEach(op => {
          console.log(`    ID: ${op.id}, Имя: ${op.name}, Email: ${op.email}, Роль: ${op.role}, Активен: ${op.is_active}`);
        });
      }
    }
    
    // Проверяем таблицу chats
    if (tablesResult.rows.some(r => r.table_name === 'chats')) {
      console.log('\n💬 Проверяем таблицу chats...');
      const chatsResult = await db.query('SELECT COUNT(*) as count FROM chats');
      console.log(`  Количество чатов: ${chatsResult.rows[0].count}`);
    }
    
    console.log('\n✅ Проверка завершена');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Ошибка проверки БД:', error);
    process.exit(1);
  }
}

checkDatabase();
