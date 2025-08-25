#!/bin/bash

# Скрипт установки PostgreSQL на VM
# Выполнять на VM 158.160.169.147

echo "=== Установка PostgreSQL на VM ==="

# Обновляем пакеты
sudo apt update

# Устанавливаем PostgreSQL
echo "Устанавливаем PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Запускаем службу
echo "Запускаем PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверяем статус
echo "Проверяем статус PostgreSQL..."
sudo systemctl status postgresql

# Настраиваем доступ
echo "Настраиваем доступ к PostgreSQL..."

# Создаем пользователя postgres с паролем
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Создаем базу данных
sudo -u postgres createdb support_db

# Настраиваем PostgreSQL для внешних подключений
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# Настраиваем pg_hba.conf для разрешения подключений
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Перезапускаем PostgreSQL
echo "Перезапускаем PostgreSQL..."
sudo systemctl restart postgresql

# Проверяем подключение
echo "Проверяем подключение..."
sudo -u postgres psql -d support_db -c "SELECT version();"

echo "=== PostgreSQL установлен и настроен ==="
echo "Теперь можно подключаться с локальной машины:"
echo "psql -h 158.160.169.147 -U postgres -d support_db"
