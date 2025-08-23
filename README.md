# 🚀 Support System - Telegram Bot Integration

Полнофункциональная система поддержки с интеграцией Telegram бота, панелью операторов и реальным временем обновлений.

## ✨ Основные возможности

- 🤖 **Telegram Bot Integration** - Автоматическая обработка сообщений
- 👥 **Operator Panel** - Современная панель для операторов поддержки
- ⚡ **Real-time Updates** - WebSocket обновления в реальном времени
- 🎯 **Smart Escalation** - Автоматическая эскалация к операторам
- 📊 **Comprehensive Dashboard** - Статистика и аналитика
- 🔒 **Secure Authentication** - JWT аутентификация и ролевой доступ
- 📱 **Responsive Design** - Адаптивный интерфейс для всех устройств

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram      │    │   Backend       │    │   Frontend      │
│   Bot API       │◄──►│   (Node.js)     │◄──►│   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Database      │
                       └─────────────────┘
```

## 🚀 Быстрый старт

### 1. Клонирование и установка

```bash
git clone <repository-url>
cd bot-test
npm install
```

### 2. Настройка базы данных

```bash
# Создайте базу данных PostgreSQL
createdb support_db

# Примените миграции
cd packages/backend
npm run migrate
```

### 3. Настройка переменных окружения

Создайте `.env` файл в `packages/backend/`:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/support_db
TELEGRAM_BOT_TOKEN=your_bot_token_here
JWT_SECRET=your-super-secret-jwt-key
```

### 4. Запуск сервисов

```bash
# Backend (Terminal 1)
cd packages/backend
npm run dev

# Frontend (Terminal 2)
cd packages/operator-admin
npm run dev
```

### 5. Настройка Telegram Bot

```bash
cd packages/backend
npm run setup-telegram
```

📖 **Подробная инструкция**: [Quick Start Guide](QUICK_START.md)

## 🛠️ Технологический стек

### Backend
- **Node.js** + **TypeScript** - Серверная часть
- **Express.js** - Web framework
- **PostgreSQL** - База данных
- **WebSocket** - Реальное время
- **JWT** - Аутентификация
- **Winston** - Логирование

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Типизация
- **Tailwind CSS** - Стилизация
- **Heroicons** - Иконки
- **WebSocket Client** - Реальное время

### Интеграции
- **Telegram Bot API** - Бот интеграция
- **node-telegram-bot-api** - Telegram клиент

## 📱 Основные функции

### Telegram Bot
- ✅ Автоматический прием сообщений
- ✅ Создание чатов и пользователей
- ✅ Умная эскалация к операторам
- ✅ Сохранение истории сообщений
- ✅ Webhook интеграция

### Operator Panel
- ✅ Список активных чатов
- ✅ Просмотр и отправка сообщений
- ✅ Информация о пользователях
- ✅ Инструменты оператора (шаблоны, заметки)
- ✅ Управление приоритетами и статусами
- ✅ Реальное время обновления

### Database
- ✅ Нормализованная структура данных
- ✅ Миграции и версионирование
- ✅ Индексы для производительности
- ✅ Connection pooling

## 🔧 Команды разработки

```bash
# Backend
npm run build          # Сборка TypeScript
npm run dev            # Запуск в режиме разработки
npm run migrate        # Применение миграций БД
npm run setup-telegram # Настройка Telegram webhook
npm run test-websocket # Тест WebSocket соединения

# Frontend
npm run build          # Сборка Next.js
npm run dev            # Запуск в режиме разработки
npm run lint           # Проверка кода
```

## 📊 API Endpoints

### Operator API (`/api/*`)
- `GET /chats` - Список чатов
- `POST /chats/:id/take` - Принять чат
- `POST /chats/:id/close` - Закрыть чат
- `GET /chats/:id/messages` - Сообщения чата
- `POST /chats/:id/messages` - Отправить сообщение

### Telegram API (`/telegram/*`)
- `POST /webhook` - Webhook для Telegram
- `GET /bot-info` - Информация о боте
- `POST /set-webhook` - Установка webhook
- `DELETE /webhook` - Удаление webhook

### Health Check
- `GET /health` - Статус сервисов

## 🔒 Безопасность

- **JWT токены** для аутентификации
- **Ролевой доступ** (operator, senior_operator, admin)
- **Валидация входных данных** с помощью Zod
- **Защита от SQL инъекций** через параметризованные запросы
- **CORS настройки** для контроля доступа
- **Rate limiting** для предотвращения злоупотреблений

## 📈 Производительность

- **Connection pooling** для базы данных
- **Оптимизированные SQL запросы** с индексами
- **WebSocket соединения** для реального времени
- **Пагинация** для больших наборов данных
- **Lazy loading** компонентов фронтенда

## 🧪 Тестирование

```bash
# Запуск тестов
npm run test

# Проверка типов
npm run type-check

# Линтинг кода
npm run lint
```

## 📚 Документация

- [Quick Start Guide](QUICK_START.md) - Быстрый старт
- [Database Setup](packages/backend/DATABASE_SETUP.md) - Настройка БД
- [Telegram Setup](packages/backend/TELEGRAM_SETUP.md) - Настройка бота
- [API Documentation](packages/backend/API_DOCUMENTATION.md) - API документация
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Детали реализации

## 🚀 Развертывание

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up -d
```

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте [документацию](QUICK_START.md)
2. Изучите [issues](../../issues) на GitHub
3. Создайте новый issue с описанием проблемы

## 🎯 Roadmap

### Ближайшие планы
- [ ] Расширенная аналитика и отчеты
- [ ] Многоязычная поддержка
- [ ] Мобильное приложение
- [ ] AI-ассистированные ответы

### Технические улучшения
- [ ] Микросервисная архитектура
- [ ] Kubernetes развертывание
- [ ] Redis кэширование
- [ ] Load balancing

---

**⭐ Если проект вам понравился, поставьте звездочку!**
