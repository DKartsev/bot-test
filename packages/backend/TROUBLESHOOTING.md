# Устранение неполадок Backend

## Проблема 1: Backend недоступен

### Симптомы:
- Сервер не запускается
- Ошибки подключения к базе данных
- CORS ошибки

### Решение:

1. **Создайте файл .env на основе .env.example:**
```bash
cp .env.example .env
```

2. **Настройте переменные окружения в .env:**
```bash
# База данных
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/support_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=support_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_minimum_32_characters_long

# CORS
CORS_ORIGIN=http://localhost:3001,http://158.160.169.147:3001
```

3. **Запустите настройку базы данных:**
```bash
npm run setup-db
```

4. **Проверьте подключение к БД:**
```bash
npm run check-db
```

5. **Запустите backend:**
```bash
npm run dev
```

## Проблема 2: Ошибка с загрузкой чатов

### Симптомы:
- Пустой список чатов
- Ошибки SQL запросов
- Отсутствующие таблицы

### Решение:

1. **Проверьте существование таблиц:**
```bash
npm run check-db
```

2. **Если таблицы отсутствуют, создайте их:**
```bash
npm run setup-db
```

3. **Проверьте миграции:**
```bash
npm run migrate
```

4. **Добавьте тестовые данные:**
```bash
npm run setup-db
```

## Проблема 3: Ошибки CORS

### Симптомы:
- Ошибки в браузере: "CORS policy"
- Frontend не может подключиться к backend

### Решение:

1. **Проверьте настройки CORS в .env:**
```bash
CORS_ORIGIN=http://localhost:3001,http://158.160.169.147:3001
```

2. **Перезапустите backend после изменения .env**

3. **Проверьте, что frontend запущен на правильном порту**

## Проблема 4: Ошибки подключения к базе данных

### Симптомы:
- "Connection refused"
- "Authentication failed"
- "Database does not exist"

### Решение:

1. **Проверьте, что PostgreSQL запущен:**
```bash
# Windows
net start postgresql-x64-15

# Linux/Mac
sudo systemctl status postgresql
```

2. **Проверьте настройки подключения в .env**

3. **Создайте базу данных:**
```sql
CREATE DATABASE support_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE support_db TO postgres;
```

4. **Запустите миграции:**
```bash
npm run setup-db
```

## Проблема 5: Ошибки JWT

### Симптомы:
- "Invalid token"
- "Token expired"
- "Unauthorized"

### Решение:

1. **Проверьте JWT_SECRET в .env (минимум 32 символа)**

2. **Перезапустите backend**

3. **Проверьте токен в браузере (localStorage)**

## Полезные команды

```bash
# Сборка проекта
npm run build

# Запуск в режиме разработки
npm run dev

# Проверка типов TypeScript
npm run type-check

# Линтинг
npm run lint

# Исправление ошибок линтера
npm run lint:fix

# Тесты
npm run test

# Проверка базы данных
npm run check-db

# Настройка базы данных
npm run setup-db
```

## Логи и отладка

1. **Проверьте логи в папке logs/**

2. **Включите DEBUG_MODE=true в .env**

3. **Проверьте health endpoint:**
```bash
curl http://localhost:3000/health
```

4. **Проверьте подключение к БД:**
```bash
npm run check-db
```

## Синхронизация с VM

После исправления проблем локально:

1. **Закоммитьте изменения:**
```bash
git add .
git commit -m "Fix backend issues and chat loading"
```

2. **Отправьте на VM:**
```bash
git push origin main
```

3. **На VM выполните:**
```bash
git pull origin main
npm install
npm run build
npm run setup-db
npm run start
```
