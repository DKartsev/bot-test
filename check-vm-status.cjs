// Скрипт для проверки статуса бота на VM
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function checkVMStatus() {
  console.log('🔍 Проверка статуса бота на VM...\n');

  try {
    // Команды для проверки статуса на VM
    const commands = [
      'docker-compose ps',
      'docker logs bot-test_bot-backend_1 --tail 20',
      'docker exec bot-test_bot-backend_1 node /app/test-bot-direct.cjs'
    ];

    for (const cmd of commands) {
      console.log(`\n📋 Выполняем: ${cmd}`);
      console.log('─'.repeat(50));
      
      try {
        const { stdout, stderr } = await execAsync(`ssh -l dankartsev 158.160.197.7 "cd /home/dankartsev/bot-test && ${cmd}"`);
        
        if (stdout) {
          console.log(stdout);
        }
        if (stderr) {
          console.log('⚠️ Stderr:', stderr);
        }
      } catch (error) {
        console.log('❌ Ошибка выполнения команды:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
  }
}

checkVMStatus().catch(console.error);
