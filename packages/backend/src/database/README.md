# База данных - Миграции и инструкции

## Обзор

База данных использует PostgreSQL и содержит все необходимые таблицы для работы операторской панели, включая пользователей, чаты, сообщения, операторов, заметки, кейсы и готовые ответы.

## Структура базы данных

### Основные таблицы

- **users** - Пользователи Telegram
- **operators** - Операторы поддержки
- **chats** - Чаты между пользователями и операторами
- **messages** - Сообщения в чатах
- **attachments** - Вложения к сообщениям
- **notes** - Заметки операторов
- **cases** - Кейсы для дальнейшего расследования
- **canned_responses** - Готовые ответы операторов

### Индексы и триггеры

- Автоматическое обновление `updated_at` полей
- Подсчет непрочитанных сообщений
- Отслеживание последней активности пользователей

## Миграции

### 001_initial_schema.sql

Создает основную структуру базы данных:

```bash
# Подключение к PostgreSQL
psql -h localhost -U postgres -d support_db

# Выполнение миграции
\i src/database/migrations/001_initial_schema.sql
```

Эта миграция создает:
- Все таблицы с правильными типами данных
- Индексы для оптимизации запросов
- Триггеры для автоматических обновлений
- Функции для работы с JSON и массивами

### 002_seed_test_data.sql

Заполняет базу данных тестовыми данными:

```bash
# Выполнение миграции с тестовыми данными
\i src/database/migrations/002_seed_test_data.sql
```

Создает:
- Тестовых операторов (admin, senior_operator, operator)
- Тестовых пользователей
- Примеры чатов и сообщений
- Готовые ответы и заметки

## Настройка окружения

### Переменные окружения

```bash
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=support_db
DB_USER=postgres
DB_PASSWORD=your_password

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/telegram

# JWT
JWT_SECRET=your_jwt_secret_key
```

### Создание базы данных

```bash
# Создание базы данных
createdb -h localhost -U postgres support_db

# Или через psql
psql -h localhost -U postgres
CREATE DATABASE support_db;
```

## Выполнение миграций

### Автоматически (через приложение)

```bash
# Запуск приложения автоматически выполнит миграции
npm run dev
```

### Вручную

```bash
# Подключение к базе данных
psql -h localhost -U postgres -d support_db

# Выполнение миграций по порядку
\i src/database/migrations/001_initial_schema.sql
\i src/database/migrations/002_seed_test_data.sql

# Проверка структуры
\dt
\d users
\d chats
\d messages
```

## Проверка состояния

### Проверка подключения

```bash
# Тест подключения
psql -h localhost -U postgres -d support_db -c "SELECT version();"
```

### Проверка таблиц

```sql
-- Список всех таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Количество записей в каждой таблице
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY tablename;
```

### Проверка индексов

```sql
-- Список индексов
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Резервное копирование

### Создание бэкапа

```bash
# Полный бэкап
pg_dump -h localhost -U postgres -d support_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Только схема (без данных)
pg_dump -h localhost -U postgres -d support_db --schema-only > schema_backup.sql

# Только данные
pg_dump -h localhost -U postgres -d support_db --data-only > data_backup.sql
```

### Восстановление из бэкапа

```bash
# Восстановление полного бэкапа
psql -h localhost -U postgres -d support_db < backup_file.sql

# Восстановление только схемы
psql -h localhost -U postgres -d support_db < schema_backup.sql

# Восстановление только данных
psql -h localhost -U postgres -d support_db < data_backup.sql
```

## Мониторинг и оптимизация

### Проверка производительности

```sql
-- Медленные запросы
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Размер таблиц
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Очистка и обслуживание

```sql
-- Анализ таблиц
ANALYZE users;
ANALYZE chats;
ANALYZE messages;

-- Очистка статистики
SELECT pg_stat_reset();
```

## Устранение неполадок

### Частые проблемы

1. **Ошибка подключения**
   ```bash
   # Проверьте настройки в .env
   # Убедитесь, что PostgreSQL запущен
   sudo systemctl status postgresql
   ```

2. **Ошибка прав доступа**
   ```bash
   # Создайте пользователя с правами
   CREATE USER support_user WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE support_db TO support_user;
   ```

3. **Ошибка миграции**
   ```bash
   # Проверьте логи PostgreSQL
   tail -f /var/log/postgresql/postgresql-*.log
   
   # Проверьте права на файлы миграций
   ls -la src/database/migrations/
   ```

### Логи и отладка

```bash
# Включение детального логирования в PostgreSQL
# В postgresql.conf:
log_statement = 'all'
log_min_duration_statement = 1000

# Перезапуск PostgreSQL
sudo systemctl restart postgresql
```

## Разработка

### Добавление новых миграций

1. Создайте новый файл: `003_new_feature.sql`
2. Добавьте описание изменений в заголовок
3. Используйте транзакции для атомарности
4. Протестируйте на тестовой базе

### Пример новой миграции

```sql
-- 003_new_feature.sql
-- Добавление нового поля в таблицу users
-- Дата: 2024-01-21
-- Автор: Developer Name

BEGIN;

-- Добавление нового поля
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- Создание индекса для поиска по телефону
CREATE INDEX idx_users_phone ON users(phone_number);

-- Обновление существующих записей
UPDATE users SET phone_number = 'не указан' WHERE phone_number IS NULL;

-- Установка NOT NULL ограничения
ALTER TABLE users ALTER COLUMN phone_number SET NOT NULL;

COMMIT;
```

## Контакты

При возникновении проблем с базой данных обращайтесь к команде разработки или создавайте issue в репозитории.
