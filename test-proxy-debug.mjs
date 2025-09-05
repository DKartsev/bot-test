import { HttpsProxyAgent } from 'https-proxy-agent';
import OpenAI from 'openai';

async function testProxy() {
  console.log('🔧 Тестирование прокси в Docker контейнере...');
  
  // Проверяем переменные окружения
  console.log('📋 Переменные окружения:');
  console.log('OPENAI_PROXY_URL:', process.env.OPENAI_PROXY_URL);
  console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY);
  console.log('HTTP_PROXY:', process.env.HTTP_PROXY);
  
  // Выбираем прокси URL
  const proxyUrl = process.env.OPENAI_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  console.log('🎯 Используемый прокси URL:', proxyUrl);
  
  if (!proxyUrl) {
    console.error('❌ Переменная окружения прокси не установлена.');
    return;
  }
  
  // Создаем агент
  const agent = new HttpsProxyAgent(proxyUrl);
  console.log('✅ HttpsProxyAgent создан успешно');
  
  // Создаем OpenAI клиент
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
    httpAgent: agent,
  });
  
  console.log('🤖 OpenAI клиент создан с прокси');
  
  try {
    console.log('🌐 Отправляем запрос к OpenAI через прокси...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello from Docker container via proxy' }],
      max_tokens: 50,
    });
    
    console.log('✅ Ответ получен от OpenAI:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Ошибка при запросе к OpenAI через прокси:');
    if (error.response) {
      console.log('📊 Статус ответа:', error.response.status);
      console.log('📋 Заголовки:', error.response.headers);
      console.log('❌ Ошибка:', error.response.data);
    } else {
      console.error('❌ Ошибка:', error.message);
    }
  }
}

testProxy();
