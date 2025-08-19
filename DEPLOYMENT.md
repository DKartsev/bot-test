# Инструкции по деплою

## Проблемы и решения

### Проблема с husky при деплое

При деплое на Render возникала ошибка:
```
sh: 1: husky: not found
npm error code 127
```

**Причина:** Скрипт `prepare` в корневом package.json пытается выполнить `husky install`, но `husky` установлен только как devDependency.

**Решение:** 
1. Изменен скрипт `prepare` для проверки окружения
2. Добавлена переменная `NPM_CONFIG_PRODUCTION=true` в Render
3. Убраны `--include=dev` флаги из build команд
4. Добавлен скрипт `build:prod` для production сборки

## Переменные окружения для Render

### Backend (bot-test-backend)
- `NODE_ENV=production`
- `NPM_CONFIG_PRODUCTION=true`
- `NODE_VERSION=20`
- `NPM_VERSION=10`
- `PORT=10000`
- `CORS_ORIGIN=https://bot-test-operator-admin.onrender.com`

### Operator Admin (bot-test-operator-admin)
- `NODE_ENV=production`
- `NPM_CONFIG_PRODUCTION=true`
- `PORT=3000`
- `NEXT_PUBLIC_API_BASE=https://bot-test-backend.onrender.com`

## Команды для деплоя

### Backend
```bash
npm ci
npm run build:prod
npm run start -w packages/backend
```

### Operator Admin
```bash
npm ci
NODE_ENV=production npm run build
npm run start
```

## Проверка деплоя

1. Убедитесь, что все переменные окружения установлены в Render Dashboard
2. Проверьте логи сборки на отсутствие ошибок с husky
3. Проверьте health check endpoints:
   - Backend: `/api/health`
   - Operator Admin: `/`

## Локальная разработка

Для локальной разработки husky будет работать нормально:
```bash
npm install  # Установит husky
npm run dev  # Запустит backend в режиме разработки
```
