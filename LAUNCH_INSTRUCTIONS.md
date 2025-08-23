# 🚀 Краткое руководство по запуску - Система поддержки

## Предварительные требования

- Node.js 18+ установлен
- PostgreSQL база данных запущена
- Переменные окружения настроены

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
# Установка корневых зависимостей
npm install

# Установка backend зависимостей
cd packages/backend
npm install

# Установка frontend зависимостей
cd ../operator-admin
npm install
```

### 2. Настройка окружения
Создайте файл `.env` в `packages/backend/`:
```bash
# База данных
DATABASE_URL=postgresql://username:password@localhost:5432/support_db
# или отдельные переменные:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=support_db
DB_USER=postgres
DB_PASSWORD=password

# Сервер
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# JWT
JWT_SECRET=your-secret-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
PUBLIC_URL=http://localhost:3000
```

### 3. Настройка базы данных
```bash
cd packages/backend
npm run migrate
```

### 4. Запуск сервисов

#### Вариант А: Использование корневых скриптов (Рекомендуется)
```bash
# Из корня проекта
npm run dev
```

#### Вариант Б: Ручной запуск
```bash
# Терминал 1 - Backend
cd packages/backend
npm run dev

# Терминал 2 - Frontend
cd packages/operator-admin
npm run dev
```

### 5. Доступ к системе
- **Backend API**: http://localhost:3000
- **Панель оператора**: http://localhost:3001
- **Проверка здоровья**: http://localhost:3000/health

## 🔧 Команды разработки

### Backend
```bash
cd packages/backend
npm run dev          # Сервер разработки
npm run build        # Сборка для продакшена
npm run migrate      # Запуск миграций БД
npm run setup-telegram # Настройка Telegram webhook
npm run test-websocket # Тестирование WebSocket соединения
```

### Frontend
```bash
cd packages/operator-admin
npm run dev          # Сервер разработки
npm run build        # Сборка для продакшена
npm run start        # Продакшен сервер
```

## 📱 Настройка Telegram бота

### 1. Создание бота
- Напишите @BotFather в Telegram
- Используйте команду `/newbot`
- Сохраните токен бота

### 2. Настройка webhook
```bash
cd packages/backend
npm run setup-telegram
```

### 3. Тестирование бота
- Отправьте сообщение вашему боту
- Проверьте логи backend для входящих сообщений
- Убедитесь, что записи в БД созданы

## 🧪 Тестирование

### Здоровье Backend
```bash
curl http://localhost:3000/health
```

### Тест WebSocket
```bash
cd packages/backend
npm run test-websocket
```

### API эндпоинты
```bash
# Получение чатов
curl -H "Authorization: Bearer test-token-1" http://localhost:3000/api/chats

# Получение информации о боте
curl http://localhost:3000/telegram/bot-info
```

## 🚨 Устранение неполадок

### Общие проблемы

#### 1. Порт уже используется
```bash
# Проверьте, что использует порт
netstat -ano | findstr :3000
# Убейте процесс
taskkill /PID <process_id> /F
```

#### 2. Ошибка соединения с БД
- Убедитесь, что PostgreSQL запущен
- Проверьте учетные данные БД
- Убедитесь, что база данных существует

#### 3. Ошибки сборки
```bash
# Очистка и переустановка
npm run clean
npm run install:all
```

#### 4. Проблемы с WebSocket
- Проверьте, что backend запущен
- Убедитесь в правильности URL WebSocket во frontend
- Проверьте консоль браузера на ошибки

## 📊 Статус системы

### Проверка здоровья
- **Backend**: http://localhost:3000/health
- **База данных**: Проверьте логи миграций
- **WebSocket**: Мониторинг статуса соединения

### Логи
- **Backend**: Вывод консоли и файлы логов
- **Frontend**: Консоль браузера и терминал
- **База данных**: Логи PostgreSQL

## 🎯 Следующие шаги

1. **Тестирование базовой функциональности**
   - Отправьте сообщение Telegram боту
   - Проверьте панель оператора на новый чат
   - Протестируйте обновления в реальном времени

2. **Настройка продакшена**
   - Установите продакшен переменные окружения
   - Настройте HTTPS для webhook'ов
   - Настройте мониторинг и логирование

3. **Настройка системы**
   - Измените готовые ответы
   - Настройте правила эскалации
   - Настройте темы UI

## 📞 Поддержка

- **Документация**: См. `README.md`, `QUICK_START.md`
- **Детали реализации**: См. `IMPLEMENTATION_SUMMARY.md`
- **Отчет об аудите**: См. `AUDIT_REPORT.md`
- **Финальный отчет**: См. `FINAL_IMPLEMENTATION_REPORT.md`

---

**🎉 Система готова к использованию! 🎉**

Вся функциональность была реализована и протестирована. Система готова к продакшену и может быть развернута немедленно.
