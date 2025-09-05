const OpenAI = require('openai');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Настройки прокси
const PROXY_CONFIG = {
  host: '193.233.115.178',
  port: 11403,
  username: 'aUGIll6zoH',
  password: 'KFu2uvbHBx'
};

// Создаем прокси URL
const proxyUrl = `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;

console.log('🔧 Настройки прокси:');
console.log(`   Host: ${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`);
console.log(`   Username: ${PROXY_CONFIG.username}`);
console.log(`   Proxy URL: http://${PROXY_CONFIG.username}:***@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`);

// Создаем HTTPS агент с прокси
const httpsAgent = new HttpsProxyAgent(proxyUrl);

// Инициализируем OpenAI клиент
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: httpsAgent, // Используем наш прокси агент
});

async function testOpenAI() {
  try {
    console.log('\n🚀 Тестируем подключение к OpenAI API через HTTP-прокси...');
    
    // Тест 1: Получение списка моделей
    console.log('\n📋 Получаем список доступных моделей...');
    const models = await openai.models.list();
    console.log(`✅ Получено ${models.data.length} моделей`);
    
    // Находим gpt-4o-mini
    const gpt4oMini = models.data.find(model => model.id === 'gpt-4o-mini');
    if (gpt4oMini) {
      console.log(`✅ Модель gpt-4o-mini найдена: ${gpt4oMini.id}`);
    } else {
      console.log('⚠️  Модель gpt-4o-mini не найдена в списке');
    }
    
    // Тест 2: Отправка сообщения
    console.log('\n💬 Отправляем сообщение в gpt-4o-mini...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Hello from VM'
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    });
    
    console.log('✅ Ответ получен:');
    console.log(`   Модель: ${completion.model}`);
    console.log(`   Ответ: ${completion.choices[0].message.content}`);
    console.log(`   Токены: ${completion.usage.total_tokens} (prompt: ${completion.usage.prompt_tokens}, completion: ${completion.usage.completion_tokens})`);
    
    console.log('\n🎉 Тест успешно завершен! OpenAI API работает через HTTP-прокси.');
    
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании OpenAI API:');
    console.error(`   Тип ошибки: ${error.name}`);
    console.error(`   Сообщение: ${error.message}`);
    
    if (error.status) {
      console.error(`   HTTP статус: ${error.status}`);
    }
    
    if (error.response) {
      console.error(`   Ответ сервера: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    process.exit(1);
  }
}

// Проверяем наличие API ключа
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Ошибка: Переменная окружения OPENAI_API_KEY не установлена');
  console.error('   Установите её командой: export OPENAI_API_KEY="your-api-key-here"');
  process.exit(1);
}

// Запускаем тест
testOpenAI();
