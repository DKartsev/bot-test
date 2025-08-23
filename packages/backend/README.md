# Backend для панели операторов

Express.js сервер с интеграцией Telegram Bot API и WebSocket для real-time обновлений.

## Возможности

- **API для операторов**: управление чатами, сообщениями, пользователями
- **Telegram Bot интеграция**: webhook, обработка сообщений, эскалация
- **WebSocket**: real-time уведомления и обновления
- **Аутентификация**: JWT токены с ролевой системой
- **Мониторинг**: health check, метрики, логирование

## Архитектура

```
src/
├── index.ts          # Главный файл сервера
├── routes/           # API маршруты
│   └── operator.ts   # Маршруты для операторов
├── services/         # Бизнес-логика
│   ├── chat.ts       # Управление чатами
│   ├── message.ts    # Управление сообщениями
│   ├── operator.ts   # Управление операторами
│   ├── telegram.ts   # Telegram Bot API
│   └── websocket.ts  # WebSocket сервис
├── middleware/       # Middleware
│   └── auth.ts       # Аутентификация и авторизация
└── types/            # TypeScript типы
    └── index.ts      # Основные интерфейсы
```

## Установка и настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

```bash
# Настройки сервера
PORT=3000
NODE_ENV=development

# База данных
DATABASE_URL=postgresql://user:password@localhost:5432/support_db

# JWT секрет для аутентификации
JWT_SECRET=your-super-secret-jwt-key-here

# Telegram Bot API
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com

# CORS настройки
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000

# Redis (для кэширования и сессий)
REDIS_URL=redis://localhost:6379

# Логирование
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Метрики Prometheus
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 3. Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите токен бота
3. Настройте webhook URL (если используете)
4. Добавьте токен в переменную `TELEGRAM_BOT_TOKEN`

### 4. Настройка базы данных

Создайте PostgreSQL базу данных и выполните миграции:

```sql
CREATE DATABASE support_db;
```

## Запуск

### Режим разработки

```bash
npm run dev
```

### Продакшн

```bash
npm run build
npm start
```

## API Endpoints

### Операторы

- `POST /api/chats` - получение списка чатов
- `GET /api/chats/:id` - получение конкретного чата
- `GET /api/chats/:id/messages` - получение сообщений чата
- `POST /api/chats/:id/messages` - отправка сообщения
- `POST /api/chats/:id/take` - принятие чата в работу
- `POST /api/chats/:id/close` - закрытие чата
- `GET /api/operators` - получение списка операторов
- `GET /api/operators/me` - получение текущего оператора

### Системные

- `GET /health` - проверка состояния сервера
- `GET /api/stats` - статистика системы

### WebSocket

- `ws://localhost:3000/ws` - WebSocket соединение для real-time обновлений

## WebSocket сообщения

### Типы сообщений

- `connection_established` - подтверждение подключения
- `new_message` - новое сообщение в чате
- `chat_status_change` - изменение статуса чата
- `chat_update` - обновление информации о чате
- `operator_status_change` - изменение статуса оператора

### Пример использования

```typescript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'new_message':
      console.log('Новое сообщение:', data.data);
      break;
    case 'chat_status_change':
      console.log('Статус чата изменился:', data.data);
      break;
  }
};
```

## Аутентификация

API использует JWT токены для аутентификации. Добавьте заголовок:

```
Authorization: Bearer <your-jwt-token>
```

### Роли операторов

- `operator` - базовые права
- `senior_operator` - расширенные права
- `admin` - полные права

## Разработка

### Структура проекта

- **Services** - бизнес-логика и работа с внешними API
- **Routes** - HTTP маршруты и валидация
- **Middleware** - промежуточное ПО (аутентификация, логирование)
- **Types** - TypeScript интерфейсы и типы

### Добавление новых маршрутов

1. Создайте файл в `src/routes/`
2. Импортируйте в `src/index.ts`
3. Добавьте middleware для аутентификации

### Добавление новых сервисов

1. Создайте класс в `src/services/`
2. Реализуйте необходимые методы
3. Добавьте типы в `src/types/`

## Мониторинг

### Health Check

```bash
curl http://localhost:3000/health
```

### Метрики Prometheus

```bash
curl http://localhost:3000/metrics
```

## Логирование

Логи выводятся в консоль и могут быть перенаправлены в файл через переменную `LOG_FILE`.

## Безопасность

- CORS настройки для ограничения доступа
- JWT токены для аутентификации
- Ролевая система для авторизации
- Валидация входных данных
- Rate limiting (планируется)

## Планы развития

- [ ] Интеграция с реальной базой данных
- [ ] Кэширование Redis
- [ ] Метрики Prometheus
- [ ] Логирование в файлы
- [ ] Тесты (unit, integration)
- [ ] Docker контейнеризация
- [ ] CI/CD pipeline

## Поддержка

При возникновении проблем:

1. Проверьте логи сервера
2. Убедитесь в корректности переменных окружения
3. Проверьте подключение к базе данных
4. Проверьте статус Telegram Bot API
