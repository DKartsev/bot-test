async function testWebhook() {
  console.log('🔗 Тестируем бота через webhook...');
  
  const webhookUrl = 'http://localhost:3000/telegram/webhook';
  const testChatId = 123456789; // Тестовый chat ID
  
  try {
    // Тестируем команду /start
    console.log('📤 Отправляем команду /start...');
    
    const startResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: testChatId,
            is_bot: false,
            first_name: 'Test',
            username: 'testuser'
          },
          chat: {
            id: testChatId,
            first_name: 'Test',
            username: 'testuser',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        }
      }),
    });
    
    const startData = await startResponse.text();
    console.log('✅ Команда /start отправлена, ответ:', startData);
    
    // Ждем немного
    console.log('⏳ Ждем 2 секунды...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Тестируем вопрос из базы знаний
    console.log('📤 Отправляем вопрос из базы знаний...');
    
    const questionResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        update_id: 2,
        message: {
          message_id: 2,
          from: {
            id: testChatId,
            is_bot: false,
            first_name: 'Test',
            username: 'testuser'
          },
          chat: {
            id: testChatId,
            first_name: 'Test',
            username: 'testuser',
            type: 'private'
          },
          date: Math.floor(Date.now() / 1000),
          text: 'как открыть сделку'
        }
      }),
    });
    
    const questionData = await questionResponse.text();
    console.log('✅ Вопрос отправлен, ответ:', questionData);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании webhook:', error.message);
  }
}

testWebhook();
