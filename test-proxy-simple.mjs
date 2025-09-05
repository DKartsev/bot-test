import { HttpsProxyAgent } from 'https-proxy-agent';

console.log('🔧 Тестирование HTTP-прокси...');

const proxyUrl = 'http://aUGIll6zoH:KFu2uvbHBx@193.233.115.178:11403';
console.log('📡 Прокси URL:', proxyUrl);

try {
  const agent = new HttpsProxyAgent(proxyUrl);
  console.log('✅ HttpsProxyAgent создан успешно');
  
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    agent: agent
  };
  
  console.log('🌐 Отправляем запрос через прокси...');
  const response = await fetch('https://api.openai.com/v1/models', fetchOptions);
  
  console.log('📊 Статус ответа:', response.status);
  console.log('📋 Заголовки:', Object.fromEntries(response.headers.entries()));
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Успешно! Количество моделей:', data.data?.length || 0);
  } else {
    const text = await response.text();
    console.log('❌ Ошибка:', text);
  }
} catch (error) {
  console.error('💥 Ошибка:', error.message);
  console.error('🔍 Детали:', error);
}
