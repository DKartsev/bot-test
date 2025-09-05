// Тест прокси для OpenAI
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('node-fetch');

require('dotenv').config();

async function testProxy() {
  console.log('🔍 Тестирование прокси...\n');

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_PROXY_URL = process.env.OPENAI_PROXY_URL || 'http://aUGIll6zoH:KFu2uvbHBx@193.233.115.178:11403';

  console.log('Прокси URL:', OPENAI_PROXY_URL);
  console.log('OpenAI API Key:', OPENAI_API_KEY ? 'настроен' : 'не настроен');

  try {
    // Создаем прокси агент
    const proxyAgent = new HttpsProxyAgent(OPENAI_PROXY_URL);
    console.log('✅ Прокси агент создан');

    // Тест 1: Простой запрос к OpenAI
    console.log('\n📡 Тест 1: Запрос к OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      agent: proxyAgent,
      timeout: 10000, // 10 секунд таймаут
    });

    console.log('Статус ответа:', response.status);
    console.log('Заголовки:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ OpenAI API доступен через прокси');
      console.log('Количество моделей:', data.data?.length || 0);
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка OpenAI API:', response.status, errorText);
    }

  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
    console.log('Тип ошибки:', error.constructor.name);
    
    if (error.code) {
      console.log('Код ошибки:', error.code);
    }
  }

  // Тест 2: Без прокси
  console.log('\n📡 Тест 2: Запрос без прокси...');
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      timeout: 10000,
    });

    console.log('Статус ответа (без прокси):', response.status);
    
    if (response.ok) {
      console.log('✅ OpenAI API доступен без прокси');
    } else {
      console.log('❌ OpenAI API недоступен без прокси');
    }
  } catch (error) {
    console.log('❌ Ошибка без прокси:', error.message);
  }
}

testProxy().catch(console.error);
