const bcrypt = require('bcrypt');

async function createHash() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    console.log('Generated hash:', hash);
  } catch (error) {
    console.error('Error:', error);
  }
}

createHash();
