const { db } = require('./packages/backend/dist/database/connection');

async function checkOperators() {
  try {
    console.log('🔍 Проверяем операторов в базе данных...');
    
    const result = await db.query('SELECT id, name, email, role FROM operators');
    
    console.log('👥 Найденные операторы:');
    result.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Имя: ${row.name}, Email: ${row.email}, Роль: ${row.role}`);
    });
    
    if (result.rows.length === 0) {
      console.log('  Операторы не найдены');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err);
    process.exit(1);
  }
}

checkOperators();
