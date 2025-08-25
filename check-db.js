const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 5;')
  .then(result => { 
    console.log('Tables:', result.rows); 
    pool.end(); 
  })
  .catch(err => { 
    console.error('Error:', err.message); 
    pool.end(); 
  });
