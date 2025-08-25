# Установка PostgreSQL для Backend

## Windows

### 1. Скачивание и установка

1. **Скачайте PostgreSQL с официального сайта:**
   - Перейдите на https://www.postgresql.org/download/windows/
   - Скачайте последнюю версию для Windows x64

2. **Установите PostgreSQL:**
   - Запустите скачанный файл
   - Выберите компоненты: PostgreSQL Server, pgAdmin, Command Line Tools
   - Установите в директорию по умолчанию
   - Установите пароль для пользователя postgres (запомните его!)
   - Оставьте порт по умолчанию (5432)

### 2. Настройка

1. **Добавьте PostgreSQL в PATH:**
   - Добавьте `C:\Program Files\PostgreSQL\[version]\bin` в переменную PATH

2. **Создайте базу данных:**
   ```bash
   # Откройте командную строку от имени администратора
   psql -U postgres
   # Введите пароль
   
   # Создайте базу данных
   CREATE DATABASE support_db;
   
   # Выйдите
   \q
   ```

### 3. Проверка установки

```bash
# Проверьте версию
psql --version

# Проверьте подключение
psql -U postgres -d support_db -h localhost
```

## Linux (Ubuntu/Debian)

### 1. Установка

```bash
# Обновите пакеты
sudo apt update

# Установите PostgreSQL
sudo apt install postgresql postgresql-contrib

# Запустите службу
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Настройка

```bash
# Переключитесь на пользователя postgres
sudo -u postgres psql

# Создайте базу данных
CREATE DATABASE support_db;

# Создайте пользователя
CREATE USER postgres WITH PASSWORD 'postgres';

# Дайте права
GRANT ALL PRIVILEGES ON DATABASE support_db TO postgres;

# Выйдите
\q
```

### 3. Проверка

```bash
# Проверьте статус
sudo systemctl status postgresql

# Проверьте подключение
psql -U postgres -d support_db -h localhost
```

## macOS

### 1. Установка через Homebrew

```bash
# Установите Homebrew если его нет
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установите PostgreSQL
brew install postgresql

# Запустите службу
brew services start postgresql
```

### 2. Настройка

```bash
# Создайте базу данных
createdb support_db

# Создайте пользователя
createuser -s postgres

# Подключитесь и установите пароль
psql postgres
ALTER USER postgres PASSWORD 'postgres';
\q
```

## Docker (Альтернатива)

Если не хотите устанавливать PostgreSQL локально:

### 1. Установите Docker Desktop

### 2. Запустите PostgreSQL в Docker

```bash
# Создайте сеть
docker network create support-network

# Запустите PostgreSQL
docker run --name postgres-support \
  --network support-network \
  -e POSTGRES_DB=support_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15

# Проверьте статус
docker ps
```

### 3. Обновите .env

```bash
# Для Docker используйте host.docker.internal вместо localhost
DB_HOST=host.docker.internal
```

## После установки PostgreSQL

1. **Обновите .env файл:**
   ```bash
   # Убедитесь что пароль правильный
   DB_PASSWORD=ваш_пароль_от_postgres
   ```

2. **Запустите настройку базы данных:**
   ```bash
   npm run setup-db
   ```

3. **Проверьте подключение:**
   ```bash
   npm run check-db
   ```

4. **Запустите backend:**
   ```bash
   npm run dev
   ```

## Решение проблем

### Ошибка "Connection refused"
- PostgreSQL не запущен
- Неправильный порт
- Брандмауэр блокирует подключение

### Ошибка "Authentication failed"
- Неправильный пароль
- Пользователь не существует
- Неправильные права доступа

### Ошибка "Database does not exist"
- База данных не создана
- Неправильное имя базы данных

## Полезные команды

```bash
# Запуск/остановка службы (Windows)
net start postgresql-x64-15
net stop postgresql-x64-15

# Запуск/остановка службы (Linux)
sudo systemctl start postgresql
sudo systemctl stop postgresql

# Проверка статуса
sudo systemctl status postgresql

# Подключение к базе
psql -U postgres -d support_db

# Список баз данных
\l

# Список таблиц
\dt

# Выход
\q
```
