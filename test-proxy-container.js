const { HttpsProxyAgent } = require('https-proxy-agent');

console.log('🔧 Тестирование HTTP-прокси из Docker контейнера...');

const proxyUrl = 'http://aUGIll6zoH:KFu2uvbHBx@193.233.115.178:11403';
console.log('Proxy URL:', proxyUrl);

try {
  const agent = new HttpsProxyAgent(proxyUrl);
  console.log('✅ Proxy agent создан успешно');
  
  // Тестируем простой HTTP запрос через прокси
  const https = require('https');
  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/models',
    method: 'GET',
    agent: agent,
    headers: {
      'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
    }
  };
  
  console.log('🚀 Отправляем запрос к OpenAI API через прокси...');
  
  const req = https.request(options, (res) => {
    console.log('📊 Статус ответа:', res.statusCode);
    console.log('📋 Заголовки:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📄 Ответ получен, длина:', data.length);
      if (res.statusCode === 200) {
        console.log('✅ Успешно! OpenAI API доступен через прокси');
        const models = JSON.parse(data);
        console.log('📋 Количество моделей:', models.data?.length || 0);
      } else {
        console.log('❌ Ошибка:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Ошибка запроса:', error.message);
  });
  
  req.setTimeout(10000, () => {
    console.error('❌ Таймаут запроса');
    req.destroy();
  });
  
  req.end();
  
} catch (error) {
  console.error('❌ Ошибка создания proxy agent:', error.message);
}
