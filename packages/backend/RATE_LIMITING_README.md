# 🚦 Система Rate Limiting

## Обзор

Система Rate Limiting обеспечивает защиту API от DDoS атак, злоупотреблений и обеспечивает справедливое распределение ресурсов между пользователями. Система поддерживает различные стратегии ограничения и интеграцию с Redis для масштабируемости.

## 🏗️ Архитектура

### 1. RateLimiterService (`src/services/rateLimiter.ts`)

Основной сервис для управления rate limiting с настраиваемыми параметрами:

```typescript
interface RateLimitConfig {
  windowMs: number;           // Временное окно в миллисекундах
  maxRequests: number;        // Максимальное количество запросов в окне
  message?: string;           // Сообщение об ошибке
  statusCode?: number;        // HTTP статус код
  headers?: boolean;          // Добавлять ли заголовки с лимитами
  skipSuccessfulRequests?: boolean; // Пропускать успешные запросы
  skipFailedRequests?: boolean;     // Пропускать неудачные запросы
  keyGenerator?: (req: Request) => string; // Генератор ключей
  handler?: (req: Request, res: Response, next: NextFunction) => void; // Обработчик превышения лимита
  onLimitReached?: (req: Request, res: Response, next: NextFunction) => void; // Callback при достижении лимита
}
```

### 2. Rate Limit Routes (`src/routes/rateLimit.ts`)

API endpoints для управления rate limiting:

- `GET /rate-limit/stats` - получение статистики
- `GET /rate-limit/configs` - получение всех конфигураций
- `GET /rate-limit/config/:name` - получение конфигурации по имени
- `POST /rate-limit/config` - добавление новой конфигурации
- `PUT /rate-limit/config/:name` - обновление конфигурации
- `DELETE /rate-limit/config/:name` - удаление конфигурации
- `POST /rate-limit/stats/reset` - сброс статистики
- `GET /rate-limit/status/:ip` - статус для конкретного IP
- `POST /rate-limit/test` - тестирование конфигурации

### 3. Готовые Middleware

```typescript
export const rateLimitMiddleware = {
  global: () => rateLimiterService.createMiddleware('global'),
  auth: () => rateLimiterService.createMiddleware('auth'),
  fileUpload: () => rateLimiterService.createMiddleware('fileUpload'),
  search: () => rateLimiterService.createMiddleware('search'),
  websocket: () => rateLimiterService.createMiddleware('websocket'),
  custom: (config: RateLimitConfig) => { /* ... */ },
};
```

## 🚀 Использование

### Базовая настройка

```typescript
import { rateLimitMiddleware } from '../services/rateLimiter';

// Применение глобального лимита
app.use(rateLimitMiddleware.global());

// Применение к конкретному роуту
router.get('/search', rateLimitMiddleware.search(), (req, res) => {
  // Поисковая логика
});
```

### Кастомная конфигурация

```typescript
import { rateLimitMiddleware } from '../services/rateLimiter';

// Создание кастомного лимита
const customLimiter = rateLimitMiddleware.custom({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 10,      // 10 запросов в минуту
  message: 'Слишком много запросов к API',
  statusCode: 429,
  headers: true,
});

router.post('/api/endpoint', customLimiter, (req, res) => {
  // Логика endpoint
});
```

### Применение к различным типам роутов

```typescript
// Поисковые запросы
router.get('/search', rateLimitMiddleware.search(), searchHandler);

// Загрузка файлов
router.post('/upload', rateLimitMiddleware.fileUpload(), uploadHandler);

// Аутентификация
router.post('/login', rateLimitMiddleware.auth(), authHandler);

// WebSocket подключения
router.ws('/ws', rateLimitMiddleware.websocket(), wsHandler);
```

## 🔧 Конфигурация

### Переменные окружения

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 минут (в миллисекундах)
RATE_LIMIT_MAX_REQUESTS=100        # Максимум 100 запросов в окне
```

### Конфигурации по умолчанию

```typescript
// Глобальный лимит для всех API
global: {
  windowMs: 15 * 60 * 1000, // 15 минут
  maxRequests: 100,          // 100 запросов
  message: 'Слишком много запросов с этого IP',
  statusCode: 429,
  headers: true,
}

// Строгий лимит для аутентификации
auth: {
  windowMs: 15 * 60 * 1000, // 15 минут
  maxRequests: 5,            // 5 попыток входа
  message: 'Слишком много попыток аутентификации',
  statusCode: 429,
  headers: true,
  skipSuccessfulRequests: true, // Сбрасываем счетчик при успешной аутентификации
}

// Лимит для загрузки файлов
fileUpload: {
  windowMs: 60 * 60 * 1000, // 1 час
  maxRequests: 20,           // 20 загрузок в час
  message: 'Превышен лимит загрузки файлов',
  statusCode: 429,
  headers: true,
}

// Лимит для поиска
search: {
  windowMs: 5 * 60 * 1000,  // 5 минут
  maxRequests: 30,           // 30 поисковых запросов
  message: 'Превышен лимит поисковых запросов',
  statusCode: 429,
  headers: true,
}

// Лимит для WebSocket соединений
websocket: {
  windowMs: 60 * 1000,      // 1 минута
  maxRequests: 10,           // 10 подключений в минуту
  message: 'Превышен лимит WebSocket подключений',
  statusCode: 429,
  headers: true,
}
```

## 🛡️ Безопасность

### Стратегии защиты

1. **IP-based limiting** - ограничение по IP адресу (по умолчанию)
2. **User-based limiting** - ограничение по пользователю
3. **Endpoint-based limiting** - ограничение по конкретным endpoint
4. **Dynamic limiting** - динамическое изменение лимитов

### Обработка превышения лимита

```typescript
// Кастомный обработчик
const customHandler = (req: Request, res: Response, next: NextFunction) => {
  // Логика обработки превышения лимита
  res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: 60, // секунды
  });
};

// Применение
const limiter = rateLimitMiddleware.custom({
  windowMs: 60 * 1000,
  maxRequests: 10,
  handler: customHandler,
});
```

## 📊 Мониторинг и статистика

### Получение статистики

```bash
# Общая статистика
GET /rate-limit/stats

# Статистика по конфигурации
GET /rate-limit/stats?config=search

# Конфигурации
GET /rate-limit/configs

# Конкретная конфигурация
GET /rate-limit/config/search
```

### Пример ответа статистики

```json
{
  "success": true,
  "data": {
    "search": {
      "totalRequests": 1250,
      "blockedRequests": 45,
      "uniqueClients": 89,
      "topOffenders": [
        {
          "key": "192.168.1.100",
          "requests": 156,
          "blocked": 12
        }
      ]
    }
  }
}
```

### Управление конфигурациями

```bash
# Добавление новой конфигурации
POST /rate-limit/config
{
  "name": "api_heavy",
  "config": {
    "windowMs": 60 * 1000,
    "maxRequests": 5,
    "message": "Слишком много тяжелых запросов"
  }
}

# Обновление конфигурации
PUT /rate-limit/config/api_heavy
{
  "maxRequests": 10
}

# Удаление конфигурации
DELETE /rate-limit/config/api_heavy
```

## 🔄 Интеграция с Redis

### Автоматическое переключение

Система автоматически использует Redis для rate limiting, если он доступен, иначе fallback на in-memory storage.

### Redis ключи

```typescript
// Формат ключей в Redis
`rate_limit:${configName}:${key}`

// Примеры
rate_limit:search:192.168.1.100
rate_limit:auth:user123
rate_limit:fileUpload:10.0.0.1
```

### TTL автоматически устанавливается

```typescript
// TTL = windowMs в секундах
await cacheService.set(redisKey, count.toString(), Math.ceil(config.windowMs / 1000));
```

## 📈 Производительность

### Оптимизации

1. **Асинхронная проверка** - не блокирует основной поток
2. **Redis интеграция** - масштабируемость и персистентность
3. **Fallback механизм** - продолжение работы при ошибках Redis
4. **Минимальные накладные расходы** - быстрая проверка лимитов

### Метрики

- Время проверки лимита: < 1ms
- Память на конфигурацию: ~100 байт
- Redis операции: 1-2 операции на запрос

## 🧪 Тестирование

### Тестирование конфигурации

```bash
POST /rate-limit/test
{
  "configName": "search",
  "testKey": "test_ip_123"
}
```

### Нагрузочное тестирование

```bash
# Тест с Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/search?q=test

# Тест с wrk
wrk -t12 -c400 -d30s http://localhost:3000/api/search?q=test
```

## 🚨 Обработка ошибок

### Типы ошибок

```typescript
// Rate limit превышен
{
  "error": "Слишком много запросов с этого IP",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "reset": "2024-01-15T10:30:00.000Z",
    "retryAfter": 900
  }
}

// Ошибки конфигурации
{
  "error": "Конфигурация не найдена",
  "code": "CONFIG_NOT_FOUND"
}
```

### HTTP заголовки

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
Retry-After: 900
```

## 🔮 Планы развития

### Краткосрочные улучшения

- [ ] Добавить поддержку JWT токенов для user-based limiting
- [ ] Реализовать adaptive rate limiting на основе нагрузки
- [ ] Добавить уведомления при превышении лимитов

### Долгосрочные улучшения

- [ ] Машинное обучение для автоматической настройки лимитов
- [ ] Интеграция с системами мониторинга (Prometheus, Grafana)
- [ ] Поддержка distributed rate limiting для кластеров
- [ ] Whitelist/blacklist для IP адресов

## 📚 Дополнительные ресурсы

- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [Redis Rate Limiting Patterns](https://redis.io/commands/incr/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [DDoS Protection Strategies](https://owasp.org/www-project-ddos-protection/)
