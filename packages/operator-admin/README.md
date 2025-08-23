# Панель операторов поддержки

Полнофункциональная панель операторов для обработки пользовательских запросов с интеграцией Telegram Bot API и real-time обновлениями.

## 🚀 Возможности

- **Real-time чаты** - мгновенные обновления через WebSocket
- **Интеграция с Telegram** - получение и отправка сообщений через бота
- **Умная эскалация** - автоматическая передача сложных запросов операторам
- **Панель инструментов** - заметки, шаблоны, инструкции, AI-улучшения
- **Фильтрация и поиск** - быстрый поиск по чатам и пользователям
- **Адаптивный дизайн** - работает на всех устройствах
- **Система уведомлений** - уведомления о новых сообщениях и статусах

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Telegram      │
│   (Next.js)     │◄──►│   (Express)     │◄──►│      Bot       │
│                 │    │                 │    │                 │
│ • ChatList      │    │ • API Routes    │    │ • Webhook      │
│ • ChatView      │    │ • WebSocket     │    │ • Messages     │
│ • UserPanel     │    │ • Telegram      │    │ • Callbacks    │
│ • ToolsPanel    │    │   Service       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Требования

- Node.js 18+
- PostgreSQL 14+
- Redis (опционально)
- Telegram Bot Token

## 🛠️ Установка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd bot-test
```

### 2. Установка зависимостей

```bash
# Frontend (панель операторов)
cd packages/operator-admin
npm install

# Backend
cd ../backend
npm install
```

### 3. Настройка переменных окружения

Создайте файл `.env.local` в `packages/operator-admin`:

```bash
# API настройки
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws

# Telegram Bot
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your_bot_token_here

# Настройки приложения
NEXT_PUBLIC_APP_NAME=Панель операторов
NEXT_PUBLIC_APP_VERSION=1.0.0
```

Создайте файл `.env` в `packages/backend`:

```bash
# Настройки сервера
PORT=3000
NODE_ENV=development

# База данных
DATABASE_URL=postgresql://user:password@localhost:5432/support_db

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com

# CORS
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
```

### 4. Настройка базы данных

```sql
-- Создание базы данных
CREATE DATABASE support_db;

-- Создание таблиц (см. INTEGRATION_GUIDE.md)
```

### 5. Настройка Telegram Bot

1. Создайте бота через @BotFather
2. Получите токен бота
3. Настройте webhook URL (для продакшена)

## 🚀 Запуск

### Режим разработки

```bash
# Terminal 1: Backend
cd packages/backend
npm run dev

# Terminal 2: Frontend
cd packages/operator-admin
npm run dev
```

### Продакшен

```bash
# Backend
cd packages/backend
npm run build
npm start

# Frontend
cd packages/operator-admin
npm run build
npm start
```

## 📱 Использование

### Для операторов

1. **Просмотр чатов** - список всех активных чатов с фильтрами
2. **Принятие чата** - клик по чату для принятия в работу
3. **Отправка сообщений** - ответы пользователям через панель инструментов
4. **Создание заметок** - внутренние заметки для команды
5. **Использование шаблонов** - быстрые ответы на типичные вопросы
6. **AI-улучшения** - улучшение ответов с помощью AI

### Для администраторов

1. **Мониторинг операторов** - статус и производительность
2. **Статистика чатов** - метрики и аналитика
3. **Управление пользователями** - блокировка, верификация
4. **Настройка системы** - конфигурация бота и правил

## 🔧 API Endpoints

### Основные эндпоинты

- `POST /api/chats` - получение списка чатов
- `GET /api/chats/:id` - получение конкретного чата
- `GET /api/chats/:id/messages` - история сообщений
- `POST /api/chats/:id/messages` - отправка сообщения
- `POST /api/chats/:id/take` - принятие чата в работу
- `POST /api/chats/:id/close` - закрытие чата

### WebSocket

- `ws://localhost:3000/ws` - real-time обновления
- Подписка на чаты: `subscribe_to_chat`
- Уведомления: `new_message`, `chat_status_change`

## 🧪 Тестирование

```bash
# Backend тесты
cd packages/backend
npm test

# Frontend тесты
cd packages/operator-admin
npm test

# Type checking
npm run type-check
```

## 📊 Мониторинг

- **Health check**: `http://localhost:3000/health`
- **Метрики**: Prometheus endpoint (если включен)
- **Логи**: Winston logger с ротацией файлов

## 🔒 Безопасность

- JWT аутентификация
- CORS настройки
- Rate limiting
- Валидация входных данных
- Helmet для заголовков безопасности

## 🚀 Развертывание

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: ./packages/backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/support
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    depends_on:
      - db

  operator-admin:
    build: ./packages/operator-admin
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=support
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
```

### Переменные окружения

См. `.env.example` файлы в каждой папке пакета.

## 📚 Документация

- [Руководство по интеграции](INTEGRATION_GUIDE.md)
- [API документация](API_DOCUMENTATION.md)
- [Архитектура системы](ARCHITECTURE.md)

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл для деталей.

## 🆘 Поддержка

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@your-domain.com

## 🎯 Roadmap

- [ ] Мобильное приложение
- [ ] Интеграция с другими мессенджерами
- [ ] Расширенная аналитика
- [ ] AI-ассистент для операторов
- [ ] Многоязычная поддержка
- [ ] Интеграция с CRM системами

---

**Панель операторов готова к использованию! 🎉**

Для получения дополнительной информации см. [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md).
