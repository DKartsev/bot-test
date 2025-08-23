# 📚 Swagger/OpenAPI документация

## Обзор

Система Swagger/OpenAPI документации обеспечивает автоматическую генерацию интерактивной документации для всех API endpoints, схем данных и примеров использования. Документация доступна в различных форматах и предоставляет удобный интерфейс для разработчиков и тестировщиков.

## 🏗️ Архитектура

### 1. Конфигурация Swagger (`src/config/swagger.ts`)

Основная конфигурация OpenAPI спецификации:

```typescript
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Telegram Bot Support API',
      version: '1.0.0',
      description: '...',
    },
    components: {
      securitySchemes: { ... },
      schemas: { ... },
      responses: { ... },
    },
    tags: [ ... ],
  },
  apis: [
    './src/routes/*.ts',
    './src/middleware/*.ts',
    './src/services/*.ts',
  ],
};
```

### 2. Swagger Routes (`src/routes/swagger.ts`)

Роуты для доступа к документации:

- `GET /docs` - Swagger UI (интерактивная документация)
- `GET /docs/json` - JSON спецификация OpenAPI
- `GET /docs/yaml` - YAML спецификация OpenAPI
- `GET /docs/html` - HTML документация
- `GET /docs/export` - Экспорт в различных форматах
- `GET /docs/info` - Информация о версии API
- `GET /docs/search` - Поиск по документации
- `GET /docs/stats` - Статистика API

### 3. JSDoc комментарии

Документация генерируется из JSDoc комментариев в коде:

```typescript
/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Получение списка чатов
 *     description: Возвращает список чатов с фильтрацией
 *     tags: [Чаты]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, closed, resolved]
 *     responses:
 *       200:
 *         description: Список чатов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chat'
 */
router.get('/chats', ...);
```

## 🚀 Использование

### Доступ к документации

```bash
# Основная документация (Swagger UI)
http://localhost:3000/docs

# JSON спецификация
http://localhost:3000/docs/json

# YAML спецификация
http://localhost:3000/docs/yaml

# HTML документация
http://localhost:3000/docs/html
```

### Экспорт спецификации

```bash
# Экспорт в JSON
curl "http://localhost:3000/docs/export?format=json" > openapi.json

# Экспорт в YAML
curl "http://localhost:3000/docs/export?format=yaml" > openapi.yaml
```

### Поиск по документации

```bash
# Поиск endpoints
GET /docs/search?q=chat

# Поиск схем
GET /docs/search?q=operator

# Поиск по описанию
GET /docs/search?q=валидация
```

## 🔧 Конфигурация

### Переменные окружения

```env
# Swagger Configuration
NODE_ENV=development          # Режим работы
PORT=3000                     # Порт сервера
```

### Настройки Swagger UI

```typescript
export const swaggerUiOptions = {
  explorer: true,                    // Включить explorer
  customCss: '...',                 // Кастомные стили
  customSiteTitle: '...',           // Заголовок страницы
  swaggerOptions: {
    persistAuthorization: true,      // Сохранять авторизацию
    displayRequestDuration: true,    // Показывать время запроса
    filter: true,                   // Включить фильтрацию
    tryItOutEnabled: true,          // Включить тестирование
  },
};
```

## 📊 Схемы данных

### Основные модели

#### Operator (Оператор)
```typescript
Operator: {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    username: { type: 'string', example: 'operator1' },
    email: { type: 'string', format: 'email' },
    firstName: { type: 'string', example: 'Иван' },
    lastName: { type: 'string', example: 'Иванов' },
    role: { type: 'string', enum: ['operator', 'admin', 'supervisor'] },
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
}
```

#### Chat (Чат)
```typescript
Chat: {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    telegramId: { type: 'integer', example: 123456789 },
    title: { type: 'string', example: 'Чат с пользователем' },
    status: { type: 'string', enum: ['open', 'in_progress', 'closed', 'resolved'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
    operatorId: { type: 'integer', nullable: true },
    userId: { type: 'integer', example: 1 },
    hasAttachments: { type: 'boolean', example: false },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    lastMessageAt: { type: 'string', format: 'date-time' },
  },
}
```

#### Message (Сообщение)
```typescript
Message: {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    chatId: { type: 'integer', example: 1 },
    operatorId: { type: 'integer', nullable: true },
    text: { type: 'string', example: 'Здравствуйте! Чем могу помочь?' },
    type: { type: 'string', enum: ['user', 'operator', 'bot'] },
    isRead: { type: 'boolean', example: false },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
}
```

### Общие ответы

#### Error (Ошибка)
```typescript
Error: {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'VALIDATION' },
        code: { type: 'string', example: 'INVALID_INPUT' },
        message: { type: 'string', example: 'Ошибка валидации' },
        timestamp: { type: 'string', format: 'date-time' },
        requestId: { type: 'string', example: 'req_1234567890_abc123def' },
      },
    },
  },
}
```

#### Pagination (Пагинация)
```typescript
Pagination: {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 20 },
    total: { type: 'integer', example: 100 },
    totalPages: { type: 'integer', example: 5 },
    hasNext: { type: 'boolean', example: true },
    hasPrev: { type: 'boolean', example: false },
  },
}
```

## 🛡️ Безопасность

### Аутентификация

```typescript
securitySchemes: {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT токен для аутентификации операторов',
  },
}
```

### Применение безопасности

```typescript
/**
 * @swagger
 * /api/chats:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     # ... остальная документация
 */
```

## 📈 Метрики и статистика

### Статистика API

```bash
GET /docs/stats
```

Пример ответа:
```json
{
  "success": true,
  "data": {
    "totalEndpoints": 45,
    "totalSchemas": 12,
    "totalTags": 13,
    "methodDistribution": {
      "get": 25,
      "post": 12,
      "put": 5,
      "delete": 3
    },
    "tagDistribution": {
      "Чаты": 8,
      "Операторы": 6,
      "Сообщения": 7
    },
    "apiVersion": "1.0.0",
    "openApiVersion": "3.0.0",
    "lastGenerated": "2024-01-15T10:30:00.000Z"
  }
}
```

### Информация о версии

```bash
GET /docs/info
```

Пример ответа:
```json
{
  "success": true,
  "data": {
    "title": "Telegram Bot Support API",
    "version": "1.0.0",
    "description": "API для системы поддержки Telegram бота...",
    "servers": [
      {
        "url": "http://localhost:3000",
        "description": "Development server"
      }
    ],
    "tags": [...],
    "paths": 45,
    "schemas": 12,
    "endpoints": 45,
    "lastGenerated": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🔍 Поиск и фильтрация

### Поиск по документации

```bash
# Поиск endpoints
GET /docs/search?q=chat

# Поиск по методу
GET /docs/search?q=POST

# Поиск по тегу
GET /docs/search?q=оператор

# Поиск по описанию
GET /docs/search?q=валидация
```

### Результаты поиска

```json
{
  "success": true,
  "data": {
    "query": "chat",
    "results": [
      {
        "type": "endpoint",
        "path": "/api/chats",
        "method": "GET",
        "summary": "Получение списка чатов",
        "description": "Возвращает список чатов с фильтрацией"
      },
      {
        "type": "endpoint",
        "path": "/api/chats/:id",
        "method": "GET",
        "summary": "Получение чата по ID",
        "description": "Возвращает информацию о конкретном чате"
      }
    ],
    "total": 2
  }
}
```

## 🎨 Кастомизация

### Кастомные стили

```typescript
customCss: `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info .title { color: #3b82f6; font-size: 36px; }
  .swagger-ui .info .description { font-size: 16px; line-height: 1.6; }
  .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #10b981; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #3b82f6; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #f59e0b; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ef4444; }
`
```

### Настройки Swagger UI

```typescript
swaggerOptions: {
  persistAuthorization: true,      // Сохранять авторизацию между сессиями
  displayRequestDuration: true,    // Показывать время выполнения запроса
  filter: true,                   // Включить фильтрацию endpoints
  showExtensions: true,           // Показывать расширения OpenAPI
  showCommonExtensions: true,     // Показывать общие расширения
  docExpansion: 'list',           // Развертывание документации (none, list, full)
  defaultModelsExpandDepth: 2,    // Глубина развертывания моделей по умолчанию
  defaultModelExpandDepth: 2,     // Глубина развертывания модели по умолчанию
  tryItOutEnabled: true,          // Включить кнопку "Try it out"
}
```

## 🔮 Планы развития

### Краткосрочные улучшения

- [ ] Автоматическая генерация примеров запросов
- [ ] Интеграция с Postman Collections
- [ ] Экспорт в PDF формат
- [ ] Автоматическое обновление документации при деплое

### Долгосрочные улучшения

- [ ] Интеграция с системами мониторинга API
- [ ] Автоматическое тестирование API на основе документации
- [ ] Генерация клиентских SDK
- [ ] Интеграция с CI/CD pipeline

## 📚 Дополнительные ресурсы

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [JSDoc Documentation](https://jsdoc.app/)
- [OpenAPI Tools](https://openapi.tools/)

## 🎯 Лучшие практики

### 1. Структурирование JSDoc комментариев

```typescript
/**
 * @swagger
 * /api/resource:
 *   get:
 *     summary: Краткое описание
 *     description: Подробное описание с примерами
 *     tags: [Тег]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *         description: Описание параметра
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resource'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
```

### 2. Организация тегов

```typescript
tags: [
  {
    name: 'Операторы',
    description: 'Управление операторами поддержки',
  },
  {
    name: 'Чаты',
    description: 'Управление чатами с пользователями',
  },
  // ... другие теги
]
```

### 3. Переиспользование схем

```typescript
// Вместо дублирования
properties: {
  id: { type: 'integer', example: 1 },
  createdAt: { type: 'string', format: 'date-time' },
}

// Используйте ссылки
properties: {
  id: { $ref: '#/components/schemas/BaseEntity/properties/id' },
  createdAt: { $ref: '#/components/schemas/BaseEntity/properties/createdAt' },
}
```

### 4. Документирование ошибок

```typescript
responses: {
  400:
    $ref: '#/components/responses/ValidationError'
  401:
    $ref: '#/components/responses/UnauthorizedError'
  403:
    $ref: '#/components/responses/ForbiddenError'
  404:
    $ref: '#/components/responses/NotFoundError'
  429:
    $ref: '#/components/responses/RateLimitError'
  500:
    $ref: '#/components/responses/InternalServerError'
}
```

## 🎉 Заключение

Система Swagger/OpenAPI документации предоставляет комплексный подход к документированию API. Автоматическая генерация, интерактивный интерфейс, поддержка различных форматов и удобный поиск помогают разработчикам и пользователям API быстро находить нужную информацию и тестировать endpoints.

Система автоматически:
- Генерирует документацию из JSDoc комментариев
- Предоставляет интерактивный интерфейс Swagger UI
- Поддерживает экспорт в JSON, YAML и HTML форматы
- Обеспечивает поиск по документации
- Предоставляет статистику API
- Поддерживает кастомизацию внешнего вида
- Интегрируется с системой безопасности
