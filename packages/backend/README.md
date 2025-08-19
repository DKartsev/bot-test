# Bot Backend

Backend сервис для поддержки бота с панелью операторов.

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Разработка
npm run dev

# Сборка
npm run build

# Запуск
npm start
```

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# Тесты в режиме наблюдения
npm run test:watch

# Тесты с покрытием
npm run test:coverage

# Тесты с UI
npm run test:ui
```

### Требования к покрытию

- **Statements**: 80% (текущее: 8.93%)
- **Branches**: 80% (текущее: 35.91%)
- **Functions**: 80% (текущее: 15%)
- **Lines**: 80% (текущее: 8.93%)

### Структура тестов

```
src/
├── test/                    # Тесты
│   ├── unit/               # Unit тесты
│   ├── integration/        # Интеграционные тесты
│   └── fixtures/           # Тестовые данные
├── **/*.test.ts            # Тесты рядом с кодом
└── **/*.spec.ts            # Альтернативное именование
```

## 🔍 Качество кода

### Линтинг

```bash
# Проверка
npm run lint

# Автоисправление
npm run lint:fix
```

### Правила ESLint

- Строгая типизация TypeScript
- Запрет `any` типов
- Обработка всех промисов
- Запрет неиспользуемых переменных

### Pre-commit хуки

Автоматическая проверка перед коммитом:
- ✅ Линтинг
- ✅ Тесты
- ✅ Покрытие кода

## 📊 CI/CD

### GitHub Actions

Автоматические проверки при:
- Push в main/develop
- Pull Request
- Ручной запуск

### Этапы CI

1. **Test** - Запуск тестов с PostgreSQL и Redis
2. **Build** - Сборка пакетов (только main)

## 🏗️ Архитектура

### Основные модули

- **RAG Pipeline** - Поиск по базе знаний
- **Admin API** - Панель операторов
- **Telegram Bot** - Интеграция с Telegram
- **Vector Store** - HNSW поиск

### Плагины Fastify

- `@fastify/cors` - CORS для фронтенда
- `@fastify/rate-limit` - Ограничение запросов
- `@fastify/multipart` - Загрузка файлов
- `@fastify/helmet` - Безопасность

## 🔐 Безопасность

### IP Allowlist

```bash
ADMIN_IP_ALLOWLIST=127.0.0.1,192.168.1.0/24
```

### Rate Limiting

```bash
ADMIN_RATE_LIMIT_MAX=100  # запросов в минуту
```

### Аутентификация

- JWT токены
- Роли: admin/operator
- Telegram webhook секреты

## 🌐 API Endpoints

### Health

- `GET /` - Статус сервиса
- `GET /health` - Детальная информация
- `GET /api/health` - API health check

### Admin

- `GET /api/admin/status` - Статус админки
- `GET /api/admin/conversations` - Список диалогов
- `GET /api/admin/metrics` - Метрики
- `GET /api/admin/faq` - FAQ
- `GET /api/admin/stream` - SSE для real-time

### Telegram

- `POST /webhooks/telegram/:secret` - Webhook

## 📝 Переменные окружения

```bash
# Обязательные
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# Опциональные
LOG_LEVEL=info
PORT=3000
CORS_ORIGIN=http://localhost:3000
ADMIN_IP_ALLOWLIST=127.0.0.1
```

## 🐛 Отладка

### Логи

```bash
LOG_LEVEL=debug npm run dev
```

### Тесты

```bash
# Подробный вывод
npm run test:coverage -- --reporter=verbose

# Отладка конкретного теста
npm run test -- --reporter=verbose src/app/pipeline/ragAnswer.test.ts
```

## 📈 Метрики

### Мониторинг

- Health checks
- Prometheus метрики
- Логирование структурированное

### Алерты

- Недоступность сервиса
- Ошибки базы данных
- Превышение лимитов API

## 🤝 Разработка

### Добавление тестов

1. Создайте файл `*.test.ts` рядом с кодом
2. Используйте `describe` и `it` блоки
3. Мокайте внешние зависимости
4. Достигайте 80% покрытия

### Добавление API

1. Создайте роут в `src/http/routes/`
2. Добавьте валидацию схемы
3. Напишите тесты
4. Обновите документацию

### Коммиты

```bash
# Проверка перед коммитом
npm run lint && npm run test:coverage

# Или используйте pre-commit хуки
git commit -m "feat: add new API endpoint"
```

## 📚 Документация

- [Testing Guide](./TESTING.md) - Подробное руководство по тестированию
- [API Documentation](./API_DOCS.md) - Документация API
- [Deployment Guide](../../README.md) - Инструкции по развертыванию
