import WebSocket from 'ws';

async function testWebSocket() {
  try {
    console.log('🧪 Тестирование WebSocket соединения...');
    
    const ws = new WebSocket('ws://localhost:3000/ws');
    
    ws.on('open', () => {
      console.log('✅ WebSocket соединение установлено');
      
      // Отправляем тестовое сообщение
      ws.send(JSON.stringify({
        type: 'test',
        data: { message: 'Тестовое сообщение от клиента' }
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Получено сообщение:', message);
      } catch (error) {
        console.log('📨 Получены данные:', data.toString());
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket соединение закрыто');
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket ошибка:', error);
    });
    
    // Закрываем соединение через 5 секунд
    setTimeout(() => {
      console.log('⏰ Закрытие тестового соединения...');
      ws.close();
    }, 5000);
    
  } catch (error) {
    console.error('💥 Ошибка тестирования WebSocket:', error);
  }
}

// Запускаем тест
testWebSocket();
