async function testTelegramBot() {
  console.log('🤖 Тестируем бота через Telegram API...');
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TEST_CHAT_ID || '1'; // Используем тестовый chat ID
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не установлен');
    return;
  }
  
  try {
    // Отправляем тестовое сообщение
    console.log('📤 Отправляем тестовое сообщение...');
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Тестовое сообщение для проверки бота',
      }),
    });
    
    const responseData = await response.json();
    console.log('✅ Сообщение отправлено:', responseData);
    
    // Ждем немного
    console.log('⏳ Ждем 3 секунды...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Отправляем вопрос из базы знаний
    console.log('📤 Отправляем вопрос из базы знаний...');
    
    const questionResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'как открыть сделку',
      }),
    });
    
    const questionData = await questionResponse.json();
    console.log('✅ Вопрос отправлен:', questionData);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании бота:', error.message);
  }
}

testTelegramBot();
