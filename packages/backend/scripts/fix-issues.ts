import { logInfo, logError } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

async function fixIssues() {
  try {
    logInfo('Начинаем исправление проблем...');

    // 1. Проверяем наличие .env файла
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    
    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(envExamplePath)) {
        logInfo('Копируем .env.example в .env...');
        fs.copyFileSync(envExamplePath, envPath);
        logInfo('Файл .env создан из .env.example');
      } else {
        logError('Файл .env.example не найден. Создайте .env вручную.');
        return;
      }
    } else {
      logInfo('Файл .env уже существует');
    }

    // 2. Проверяем и создаем необходимые директории
    const dirs = ['logs', 'uploads'];
    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logInfo(`Директория ${dir} создана`);
      }
    }

    // 3. Проверяем package.json скрипты
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const requiredScripts = ['check-db', 'setup-db'];
      
      for (const script of requiredScripts) {
        if (!packageContent.scripts[script]) {
          logError(`Скрипт ${script} отсутствует в package.json`);
        }
      }
    }

    // 4. Проверяем TypeScript конфигурацию
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
      logInfo('tsconfig.json найден');
    } else {
      logError('tsconfig.json не найден');
    }

    // 5. Проверяем исходный код
    const srcPath = path.join(process.cwd(), 'src');
    if (fs.existsSync(srcPath)) {
      logInfo('Директория src найдена');
    } else {
      logError('Директория src не найдена');
    }

    logInfo('Проверка завершена. Теперь выполните следующие команды:');
    logInfo('1. npm install');
    logInfo('2. npm run build');
    logInfo('3. npm run setup-db');
    logInfo('4. npm run dev');

  } catch (error) {
    logError('Ошибка при исправлении проблем', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

// Запускаем исправление
fixIssues().catch(error => {
  logError('Критическая ошибка при исправлении проблем', { error: error instanceof Error ? error.message : 'Unknown error' });
  process.exit(1);
});
