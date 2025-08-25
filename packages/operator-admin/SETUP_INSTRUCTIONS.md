# Инструкции по настройке панели операторов

## Проблемы и решения

### 1. Backend недоступен

**Симптомы:**
- В заголовке показывается "Backend недоступен"
- Чаты не загружаются
- API запросы завершаются с ошибкой

**Решения:**

#### A. Запуск backend'а
```bash
# В директории packages/backend
cd packages/backend
npm run dev
```

#### B. Проверка переменных окружения
Создайте файл `.env.local` в директории `packages/operator-admin`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
```

#### C. Проверка портов
Убедитесь, что:
- Backend запущен на порту 3000
- Панель операторов запущена на порту 3001
- Нет конфликтов портов

### 2. Чаты не загружаются

**Симптомы:**
- Список чатов пуст
- Показывается ошибка загрузки
- Бесконечный спиннер

**Решения:**

#### A. Проверка базы данных
Используйте скрипт диагностики БД:

```bash
# Установка зависимостей
cd tools
npm install

# Полная диагностика
node db-diagnostics.js

# Проверка таблиц
node db-diagnostics.js tables

# Проверка структуры таблицы chats
node db-diagnostics.js structure chats

# Проверка данных таблицы chats
node db-diagnostics.js data chats
```

#### B. Проверка схемы БД
Убедитесь, что в БД существует схема `support` с таблицами:
- `chats` - чаты
- `messages` - сообщения
- `users` - пользователи
- `operators` - операторы

#### C. Проверка миграций
```bash
cd packages/backend
npm run migrate
```

### 3. Fallback режим

**Что это:**
Когда backend недоступен, панель показывает демонстрационные данные.

**Как отключить:**
1. Запустите backend
2. Перезагрузите страницу
3. Fallback режим автоматически отключится

## Настройка переменных окружения

### Для разработки (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
NODE_ENV=development
```

### Для продакшена
```env
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
NODE_ENV=production
```

## Запуск панели операторов

### Разработка
```bash
cd packages/operator-admin
npm run dev
```

### Продакшен
```bash
cd packages/operator-admin
npm run build
npm run start
```

## Диагностика проблем

### 1. Проверка логов
Откройте DevTools (F12) и проверьте консоль на ошибки.

### 2. Проверка сети
В DevTools -> Network проверьте:
- Статус API запросов
- Время ответа
- Ошибки CORS

### 3. Проверка WebSocket
В консоли должны быть сообщения:
- "WebSocket подключен" - успех
- "WebSocket ошибка" - проблема

### 4. Проверка БД
```bash
# Подключение к БД
psql -h localhost -U postgres -d support_db

# Проверка схемы
\dn

# Проверка таблиц
\dt support.*

# Проверка данных
SELECT COUNT(*) FROM support.chats;
```

## Частые проблемы

### CORS ошибки
**Решение:** Проверьте настройки CORS в backend'е

### Ошибки аутентификации
**Решение:** Проверьте JWT токены и middleware аутентификации

### Проблемы с WebSocket
**Решение:** Проверьте настройки WebSocket сервера и прокси

### Проблемы с БД
**Решение:** Используйте скрипт диагностики БД для выявления проблем

## Контакты для поддержки

При возникновении проблем:
1. Проверьте логи в консоли
2. Запустите диагностику БД
3. Проверьте статус backend'а
4. Обратитесь к документации backend'а
