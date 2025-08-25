#!/usr/bin/env node

const http = require('http');
const https = require('https');

class BackendChecker {
  constructor() {
    this.urls = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://158.160.169.147:3000'
    ];
  }

  async checkUrl(url) {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const timeout = setTimeout(() => {
        resolve({ url, status: 'timeout', error: 'Timeout after 5 seconds' });
      }, 5000);

      const req = protocol.get(url + '/health', (res) => {
        clearTimeout(timeout);
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve({ 
              url, 
              status: 'success', 
              statusCode: res.statusCode,
              response: response
            });
          } catch (e) {
            resolve({ 
              url, 
              status: 'error', 
              statusCode: res.statusCode,
              error: 'Invalid JSON response',
              rawResponse: data
            });
          }
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ url, status: 'error', error: error.message });
      });

      req.setTimeout(5000, () => {
        clearTimeout(timeout);
        req.destroy();
        resolve({ url, status: 'timeout', error: 'Request timeout' });
      });
    });
  }

  async checkAll() {
    console.log('🔍 Проверка статуса backend\'а...\n');
    
    const results = [];
    
    for (const url of this.urls) {
      console.log(`Проверяю ${url}...`);
      const result = await this.checkUrl(url);
      results.push(result);
      
      if (result.status === 'success') {
        console.log(`✅ ${url} - Доступен (${result.statusCode})`);
        if (result.response) {
          console.log(`   Ответ: ${JSON.stringify(result.response)}`);
        }
      } else if (result.status === 'timeout') {
        console.log(`⏰ ${url} - Таймаут`);
      } else {
        console.log(`❌ ${url} - Ошибка: ${result.error}`);
      }
      console.log('');
    }

    // Сводка
    console.log('📊 СВОДКА:');
    console.log('='.repeat(50));
    
    const available = results.filter(r => r.status === 'success');
    const unavailable = results.filter(r => r.status !== 'success');
    
    if (available.length > 0) {
      console.log(`✅ Доступные backend'ы: ${available.length}`);
      available.forEach(r => console.log(`   - ${r.url}`));
    } else {
      console.log('❌ Нет доступных backend\'ов');
    }
    
    if (unavailable.length > 0) {
      console.log(`❌ Недоступные backend'ы: ${unavailable.length}`);
      unavailable.forEach(r => console.log(`   - ${r.url}: ${r.error}`));
    }

    // Рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    if (available.length > 0) {
      console.log('✅ Backend доступен! Панель операторов должна работать.');
      console.log(`   Используйте URL: ${available[0].url}`);
    } else {
      console.log('❌ Backend недоступен. Проверьте:');
      console.log('   1. Запущен ли backend (npm run dev в packages/backend)');
      console.log('   2. Правильный ли порт (3000)');
      console.log('   3. Нет ли конфликтов портов');
      console.log('   4. Firewall/антивирус не блокирует соединения');
    }

    return results;
  }
}

// CLI интерфейс
async function main() {
  const checker = new BackendChecker();
  
  if (process.argv.includes('--watch')) {
    console.log('👀 Режим мониторинга (проверка каждые 10 секунд)');
    console.log('Нажмите Ctrl+C для остановки\n');
    
    const check = async () => {
      await checker.checkAll();
      console.log('\n' + '='.repeat(50) + '\n');
    };
    
    await check();
    setInterval(check, 10000);
  } else {
    await checker.checkAll();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BackendChecker;
