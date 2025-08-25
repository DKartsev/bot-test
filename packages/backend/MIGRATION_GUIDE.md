# Руководство по миграции с Supabase на PostgreSQL

## Обзор

Этот документ описывает процесс миграции backend с Supabase на локальный PostgreSQL, установленный на VM 158.160.169.147.

## Преимущества миграции

- **Локальный контроль**: Полный контроль над базой данных
- **Производительность**: Более быстрое подключение к VM
- **Разработка**: Удобнее для разработки и тестирования
- **Стоимость**: Отсутствие платы за Supabase

## Этапы миграции

### Этап 1: Подготовка VM

1. **Подключитесь к VM:**
```bash
ssh -l dankartsev 158.160.169.147
```

2. **Установите PostgreSQL:**
```bash
# Скопируйте скрипт на VM
scp scripts/install-postgresql-vm.sh dankartsev@158.160.169.147:~/

# Выполните установку
chmod +x install-postgresql-vm.sh
./install-postgresql-vm.sh
```

3. **Проверьте установку:**
```bash
# Проверьте статус
sudo systemctl status postgresql

# Проверьте подключение
psql -h localhost -U postgres -d support_db
```

### Этап 2: Настройка локальной машины

1. **Обновите .env файл:**
```bash
# Убедитесь что DB_HOST указывает на VM
DB_HOST=158.160.169.169.147
DB_PORT=5432
DB_NAME=support_db
DB_USER=postgres
DB_PASSWORD=postgres
```

2. **Добавьте настройки Supabase для миграции:**
```bash
SUPABASE_HOST=your-project.supabase.co
SUPABASE_PORT=5432
SUPABASE_DB=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your-supabase-password
```

### Этап 3: Миграция данных

1. **Соберите проект:**
```bash
npm run build
```

2. **Запустите миграцию:**
```bash
npm run migrate-from-supabase
```

3. **Проверьте результат:**
```bash
npm run check-db
```

### Этап 4: Тестирование

1. **Запустите backend:**
```bash
npm run dev
```

2. **Проверьте API endpoints:**
```bash
# Health check
curl http://localhost:3000/health

# Проверка чатов (требует JWT токен)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/chats
```

## Структура базы данных

### Таблица users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  avatar_url TEXT,
  balance DECIMAL(10,2) DEFAULT 0,
  deals_count INTEGER DEFAULT 0,
  flags JSONB DEFAULT '{}',
  is_blocked BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Таблица support_chats
```sql
CREATE TABLE support_chats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  source VARCHAR(50) DEFAULT 'telegram',
  operator_id INTEGER,
  assigned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Таблица messages
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES support_chats(id),
  author_type VARCHAR(50),
  author_id INTEGER,
  text TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);
```

### Таблица operators
```sql
CREATE TABLE operators (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'operator',
  is_active BOOLEAN DEFAULT TRUE,
  max_chats INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

## Индексы для оптимизации

```sql
-- Индексы для support_chats
CREATE INDEX idx_support_chats_user_id ON support_chats(user_id);
CREATE INDEX idx_support_chats_status ON support_chats(status);
CREATE INDEX idx_support_chats_operator_id ON support_chats(operator_id);

-- Индексы для messages
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Индексы для users
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

## Команды для управления

### Проверка состояния
```bash
# Проверка подключения к БД
npm run check-db

# Настройка БД (создание таблиц)
npm run setup-db

# Миграция из Supabase
npm run migrate-from-supabase
```

### Разработка
```bash
# Сборка
npm run build

# Запуск в режиме разработки
npm run dev

# Проверка типов
npm run type-check
```

## Решение проблем

### Ошибка подключения к PostgreSQL
```bash
# Проверьте статус на VM
sudo systemctl status postgresql

# Проверьте настройки подключения
sudo cat /etc/postgresql/*/main/postgresql.conf | grep listen_addresses
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep "0.0.0.0"
```

### Ошибка аутентификации
```bash
# Сбросьте пароль postgres
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Проблемы с миграцией
```bash
# Проверьте подключение к Supabase
psql "postgresql://postgres:password@your-project.supabase.co:5432/postgres"

# Проверьте подключение к локальной БД
psql -h 158.160.169.147 -U postgres -d support_db
```

## Синхронизация с VM

После внесения изменений:

1. **Закоммитьте изменения:**
```bash
git add .
git commit -m "Migrate from Supabase to PostgreSQL"
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

## Мониторинг и обслуживание

### Логи PostgreSQL
```bash
# Просмотр логов
sudo tail -f /var/log/postgresql/postgresql-*.log

# Проверка производительности
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### Резервное копирование
```bash
# Создание бэкапа
pg_dump -h 158.160.169.147 -U postgres support_db > backup_$(date +%Y%m%d).sql

# Восстановление
psql -h 158.160.169.147 -U postgres support_db < backup_20240826.sql
```

## Заключение

После успешной миграции у вас будет:
- Полностью локальная база данных PostgreSQL
- Быстрое подключение к VM
- Полный контроль над данными
- Удобная среда для разработки

Все API endpoints будут работать с новой базой данных, и вы сможете легко масштабировать и оптимизировать систему.
