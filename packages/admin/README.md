# Admin Panel - Панель операторов

Панель администратора для управления ботом поддержки.

## 🚀 Деплой на Render

### 1. Настройка в Render Dashboard

1. Создайте новый **Static Site** сервис
2. **Name**: `bot-test-front`
3. **Build Command**: `npm ci && npm run build -w packages/admin`
4. **Publish Directory**: `packages/admin/admin-out`
5. **Environment**: `Static`

### 2. Переменные окружения

Добавьте следующие переменные в Render Dashboard:

```bash
# Обязательные
NODE_VERSION=20
NPM_VERSION=10

# Опциональные (если нужны для фронтенда)
NEXT_PUBLIC_APP_URL=https://bot-test-front.onrender.com
NEXT_PUBLIC_API_URL=https://bot-test-6gsg.onrender.com
```

### 3. Автоматический деплой

- Подключите GitHub репозиторий
- Включите **Auto-Deploy** для ветки `main`
- Render автоматически будет пересобирать и деплоить при каждом push

## 🛠 Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Очистка собранных файлов
npm run clean
```

## 📁 Структура проекта

```