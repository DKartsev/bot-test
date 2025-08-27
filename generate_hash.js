const bcrypt = require('bcrypt');

async function generateHash() {
  try {
    const hash = await bcrypt.hash('test123', 12);
    console.log('Generated hash for test123:', hash);
    
    // Проверим, что хеш работает
    const isValid = await bcrypt.compare('test123', hash);
    console.log('Hash validation test:', isValid);
    
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash();
