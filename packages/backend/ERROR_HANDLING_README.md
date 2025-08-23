# 🚨 Система централизованной обработки ошибок

## Обзор

Система централизованной обработки ошибок обеспечивает единообразное управление всеми типами ошибок в приложении, автоматическое логирование, структурированные ответы клиентам и детальную аналитику ошибок. Система поддерживает различные типы ошибок, автоматическую классификацию и гибкую конфигурацию.

## 🏗️ Архитектура

### 1. ErrorHandlerService (`src/services/errorHandler.ts`)

Основной сервис для создания и управления ошибками:

```typescript
interface AppError {
  type: ErrorType;                    // Тип ошибки
  code: ErrorCode;                    // Код ошибки
  message: string;                    // Сообщение об ошибке
  details?: Record<string, any>;      // Детали ошибки
  timestamp: Date;                    // Время возникновения
  requestId?: string;                 // ID запроса
  userId?: number;                    // ID пользователя
  operatorId?: number;                // ID оператора
  path?: string;                      // Путь запроса
  method?: string;                    // HTTP метод
  userAgent?: string;                 // User-Agent
  ip?: string;                        // IP адрес
  stack?: string;                     // Stack trace
}
```

### 2. Error Handler Middleware (`src/middleware/errorHandler.ts`)

Набор middleware для автоматической обработки ошибок:

- **requestIdMiddleware** - генерация уникального ID для каждого запроса
- **validationErrorHandler** - обработка ошибок валидации
- **authErrorHandler** - обработка ошибок аутентификации
- **errorHandlerMiddleware** - основной обработчик ошибок
- **notFoundHandler** - обработка 404 ошибок
- **unhandledErrorHandler** - обработка необработанных ошибок
- **performanceMonitor** - мониторинг производительности запросов

### 3. Error Handler Routes (`src/routes/errorHandler.ts`)

API endpoints для управления системой обработки ошибок:

- `GET /error-handler/stats` - статистика ошибок
- `GET /error-handler/critical` - критические ошибки
- `GET /error-handler/config` - текущая конфигурация
- `PUT /error-handler/config` - обновление конфигурации
- `POST /error-handler/stats/reset` - сброс статистики
- `GET /error-handler/top-errors` - топ ошибок по частоте
- `GET /error-handler/by-type/:type` - ошибки по типу
- `GET /error-handler/summary` - сводка по ошибкам
- `POST /error-handler/test` - тестирование системы
- `GET /error-handler/export` - экспорт статистики

## 🚀 Использование

### Базовая интеграция

```typescript
import { errorHandlerService, ErrorType, ErrorCode } from '../services/errorHandler';

// Создание ошибки валидации
const validationError = errorHandlerService.createValidationError(
  'email',
  'invalid-email',
  'Должен быть валидный email адрес',
  req
);

// Создание ошибки аутентификации
const authError = errorHandlerService.createAuthError(
  ErrorCode.INVALID_TOKEN,
  'Недействительный токен доступа',
  req
);

// Создание ошибки "не найдено"
const notFoundError = errorHandlerService.createNotFoundError(
  'chat',
  123,
  req
);
```

### Обработка ошибок в роутах

```typescript
router.get('/chats/:id', requireOperator, asyncHandler(async (req, res) => {
  try {
    const chat = await chatService.getChat(Number(req.params.id));
    
    if (!chat) {
      const error = errorHandlerService.createNotFoundError(
        'chat',
        req.params.id,
        req
      );
      
      return res.status(404).json(
        errorHandlerService.formatErrorForClient(error)
      );
    }
    
    res.json(chat);
  } catch (error) {
    const appError = errorHandlerService.createDatabaseError(
      'get_chat',
      'chats',
      error,
      req
    );
    
    res.status(500).json(
      errorHandlerService.formatErrorForClient(appError)
    );
  }
}));
```

### Автоматическая обработка ошибок

```typescript
// Middleware автоматически обрабатывает все ошибки
app.use(errorHandlerMiddleware);

// Обработка 404 ошибок
app.use(notFoundHandler);

// Обработка необработанных ошибок
app.use(unhandledErrorHandler);
```

## 🔧 Конфигурация

### Переменные окружения

```env
# Error Handling Configuration
MAX_ERROR_DETAILS_LENGTH=1000        # Максимальная длина деталей ошибки
ERROR_SAMPLING_RATE=1.0              # Частота логирования ошибок (0.0 - 1.0)
NODE_ENV=development                 # Режим работы (development/production)
```

### Динамическое обновление конфигурации

```bash
# Обновление конфигурации
PUT /error-handler/config
{
  "enableDetailedErrors": true,
  "enableStackTraces": false,
  "errorSamplingRate": 0.8,
  "maxErrorDetailsLength": 2000
}
```

## 📊 Мониторинг и аналитика

### Статистика ошибок

```bash
# Общая статистика
GET /error-handler/stats

# Критические ошибки
GET /error-handler/critical?limit=50

# Топ ошибок
GET /error-handler/top-errors?limit=20

# Сводка
GET /error-handler/summary
```

### Пример ответа статистики

```json
{
  "success": true,
  "data": {
    "totalErrors": 1250,
    "criticalErrorsCount": 15,
    "errorCounts": {
      "VALIDATION_INVALID_INPUT": 450,
      "AUTHENTICATION_INVALID_TOKEN": 200,
      "DATABASE_CONNECTION_ERROR": 50,
      "FILE_UPLOAD_FAILED": 100
    },
    "topErrors": [
      {
        "code": "VALIDATION_INVALID_INPUT",
        "count": 450,
        "percentage": 36.0
      }
    ]
  }
}
```

## 🛡️ Типы ошибок и коды

### Типы ошибок (ErrorType)

```typescript
enum ErrorType {
  VALIDATION = 'VALIDATION',           // Ошибки валидации
  AUTHENTICATION = 'AUTHENTICATION',   // Ошибки аутентификации
  AUTHORIZATION = 'AUTHORIZATION',      // Ошибки авторизации
  NOT_FOUND = 'NOT_FOUND',             // Ресурс не найден
  CONFLICT = 'CONFLICT',               // Конфликты данных
  RATE_LIMIT = 'RATE_LIMIT',           // Превышение лимитов
  DATABASE = 'DATABASE',               // Ошибки базы данных
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE', // Ошибки внешних сервисов
  FILE_UPLOAD = 'FILE_UPLOAD',         // Ошибки загрузки файлов
  CACHE = 'CACHE',                     // Ошибки кэша
  WEBSOCKET = 'WEBSOCKET',             // Ошибки WebSocket
  INTERNAL = 'INTERNAL',               // Внутренние ошибки
}
```

### Коды ошибок (ErrorCode)

```typescript
enum ErrorCode {
  // Валидация
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Аутентификация
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Авторизация
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // Не найдено
  CHAT_NOT_FOUND = 'CHAT_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  OPERATOR_NOT_FOUND = 'OPERATOR_NOT_FOUND',
  
  // И другие...
}
```

## 🔍 Автоматические проверки

### 1. Валидация входных данных

```typescript
// Автоматическое создание ошибки валидации
const validationError = errorHandlerService.createValidationError(
  'email',
  userInput.email,
  'email_format',
  req
);
```

### 2. Обработка ошибок базы данных

```typescript
try {
  await database.query('SELECT * FROM users WHERE id = ?', [userId]);
} catch (error) {
  const dbError = errorHandlerService.createDatabaseError(
    'get_user',
    'users',
    error,
    req
  );
  throw dbError;
}
```

### 3. Обработка ошибок внешних сервисов

```typescript
try {
  await telegramApi.sendMessage(chatId, message);
} catch (error) {
  const externalError = errorHandlerService.createExternalServiceError(
    'telegram',
    'send_message',
    error,
    req
  );
  throw externalError;
}
```

## 📈 Метрики производительности

### HTTP заголовки

```http
X-Request-ID: req_1234567890_abc123def
X-Response-Time: 150ms
X-Error-Type: VALIDATION
X-Error-Code: INVALID_INPUT
X-Query-Warnings: 2
```

### Мониторинг медленных запросов

```typescript
// Middleware автоматически логирует запросы медленнее 1 секунды
if (duration > 1000) {
  logWarning('Медленный запрос', {
    requestId: req.id,
    path: req.path,
    method: req.method,
    duration,
    statusCode: res.statusCode,
  });
}
```

## 🚨 Обработка критических ошибок

### Автоматическое уведомление

```typescript
// Критические ошибки автоматически добавляются в список
if (this.config.criticalErrorCodes.includes(code)) {
  this.addCriticalError(error);
  
  // Уведомление администратора
  notifyAdminAboutCriticalError(error);
}
```

### Мониторинг критических ошибок

```bash
# Получение критических ошибок
GET /error-handler/critical?limit=50

# Экспорт в CSV
GET /error-handler/export?format=csv
```

## 🔮 Планы развития

### Краткосрочные улучшения

- [ ] Интеграция с системами мониторинга (Prometheus, Grafana)
- [ ] Автоматические уведомления через Slack/Email
- [ ] Группировка похожих ошибок
- [ ] Автоматическое создание тикетов для критических ошибок

### Долгосрочные улучшения

- [ ] Машинное обучение для предсказания ошибок
- [ ] Интеграция с системами APM (Application Performance Monitoring)
- [ ] Автоматическое исправление типовых ошибок
- [ ] Интеграция с системами логирования (ELK Stack)

## 📚 Дополнительные ресурсы

- [Error Handling Best Practices](https://expressjs.com/en/guide/error-handling.html)
- [Node.js Error Handling](https://nodejs.org/en/docs/guides/error-handling-and-logging/)
- [Express Error Handling](https://expressjs.com/en/advanced/best-practices-performance.html#handle-exceptions-properly)
- [Logging Best Practices](https://12factor.net/logs)

## 🎯 Лучшие практики

### 1. Создание структурированных ошибок

```typescript
// Хорошо - структурированная ошибка
const error = errorHandlerService.createError(
  ErrorType.VALIDATION,
  ErrorCode.INVALID_INPUT,
  'Email адрес имеет неверный формат',
  { field: 'email', value: userInput.email, expectedFormat: 'email' },
  req
);

// Плохо - простая строка
throw new Error('Invalid email');
```

### 2. Логирование с контекстом

```typescript
// Middleware автоматически добавляет контекст
logError('Ошибка приложения', {
  requestId: req.id,
  error: appError,
  userAgent: req.get('User-Agent'),
  ip: req.ip,
});
```

### 3. Безопасность данных

```typescript
// Автоматическая очистка чувствительных данных
function sanitizeRequestBody(body: any): any {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  for (const field of sensitiveFields) {
    if (body[field]) {
      body[field] = '[SENSITIVE_DATA]';
    }
  }
  
  return body;
}
```

### 4. Мониторинг производительности

```typescript
// Автоматический мониторинг времени ответа
res.on('finish', () => {
  const duration = Date.now() - startTime;
  
  if (duration > 1000) {
    logWarning('Медленный запрос', {
      requestId: req.id,
      path: req.path,
      duration,
    });
  }
});
```

## 🎉 Заключение

Система централизованной обработки ошибок предоставляет комплексный подход к управлению ошибками в приложении. Автоматическое логирование, структурированные ответы, детальная аналитика и гибкая конфигурация помогают разработчикам и операторам быстро выявлять и устранять проблемы, обеспечивая высокую надежность и производительность приложения.

Система автоматически:
- Генерирует уникальные ID для каждого запроса
- Классифицирует ошибки по типам и кодам
- Логирует ошибки с полным контекстом
- Очищает чувствительные данные
- Предоставляет детальную статистику
- Мониторит производительность запросов
- Уведомляет о критических ошибках
