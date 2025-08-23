# Quick Start Guide - Support System

## 🚀 Быстрый запуск системы поддержки

### Предварительные требования

- Node.js 18+
- PostgreSQL 12+
- npm или yarn

### 1. Установка зависимостей

```bash
# В корневой директории проекта
npm install

# В директории backend
cd packages/backend
npm install

# В директории frontend
cd ../operator-admin
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

Создайте файл `.env` в `packages/backend/`:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/support_db

# Telegram Bot (получите токен у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Server
PORT=3000
CORS_ORIGIN=http://localhost:3001
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
```

### 4. Запуск сервисов

#### Backend (Terminal 1)
```bash
cd packages/backend
npm run dev
```

#### Frontend (Terminal 2)
```bash
cd packages/operator-admin
npm run dev
```

### 5. Настройка Telegram Bot

```bash
cd packages/backend
npm run setup-telegram
```

### 6. Проверка работы

- **Backend API**: http://localhost:3000/health
- **Frontend**: http://localhost:3001
- **WebSocket**: ws://localhost:3000/ws

## 📱 Тестирование

### 1. Отправьте сообщение боту в Telegram
### 2. Проверьте, что чат появился в панели оператора
### 3. Примите чат и отправьте ответ
### 4. Убедитесь, что сообщение доставлено пользователю

## 🔧 Полезные команды

```bash
# Миграции базы данных
npm run migrate

# Настройка Telegram webhook
npm run setup-telegram

# Тест WebSocket
npm run test-websocket

# Сборка для продакшена
npm run build
```

## 📚 Документация

- [Database Setup](packages/backend/DATABASE_SETUP.md)
- [Telegram Setup](packages/backend/TELEGRAM_SETUP.md)
- [API Documentation](packages/backend/API_DOCUMENTATION.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи в консоли
2. Убедитесь, что все сервисы запущены
3. Проверьте подключение к базе данных
4. Убедитесь, что переменные окружения настроены

## 🎯 Что дальше?

После успешного запуска:

1. Настройте продакшен окружение
2. Добавьте SSL сертификат для HTTPS
3. Настройте мониторинг и логирование
4. Добавьте дополнительные функции по необходимости
