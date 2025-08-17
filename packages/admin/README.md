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

# Экспорт статических файлов
npm run export
```

## 📁 Структура проекта

```
packages/admin/
├── pages/           # Страницы Next.js
├── components/      # React компоненты
├── admin-out/      # Собранные статические файлы (генерируется)
├── next.config.js  # Конфигурация Next.js
└── package.json    # Зависимости и скрипты
```

## 🔧 Конфигурация

### next.config.js
- `output: "export"` - статический экспорт
- `basePath: "/admin"` - базовый путь для роутинга
- `distDir: "admin-out"` - папка для собранных файлов
- `trailingSlash: true` - добавляет слеш в конце URL

## 🌐 URL структура

После деплоя панель будет доступна по адресу:
- **Главная**: `https://bot-test-front.onrender.com/admin/`
- **Метрики**: `https://bot-test-front.onrender.com/admin/metrics`

## 🚨 Устранение неполадок

### Ошибка "module is not defined in ES module scope"
- Убедитесь, что в `next.config.js` используется `export default` вместо `module.exports`
- Проверьте, что в `package.json` установлен `"type": "module"`

### Проблемы со сборкой
- Проверьте версию Node.js (требуется 20+)
- Убедитесь, что все зависимости установлены
- Проверьте логи сборки в Render Dashboard

### Проблемы с роутингом
- Убедитесь, что `basePath` настроен правильно
- Проверьте, что все ссылки используют относительные пути
- Добавьте rewrite правила в Render для SPA роутинга
