// Конфигурация API для панели операторов
export const API_CONFIG = {
  // Основной URL backend'а
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://158.160.169.147:3000',
  
  // WebSocket URL
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://158.160.169.147:3000/ws',
  
  // Fallback URL'ы для разработки
  FALLBACK_URLS: [
    'http://158.160.169.147:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  
  // Таймауты
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  
  // Endpoints
  ENDPOINTS: {
    CHATS: '/api/chats',
    MESSAGES: '/api/chats/:id/messages',
    OPERATORS: '/api/operators',
    HEALTH: '/health',
    STATS: '/api/stats'
  }
};

// Функция для получения рабочего URL
export function getWorkingApiUrl(): string {
  // В продакшене используем основной URL
  if (process.env.NODE_ENV === 'production') {
    return API_CONFIG.BASE_URL;
  }
  
  // В разработке возвращаем основной URL, fallback логика в API клиенте
  return API_CONFIG.BASE_URL;
}
