#!/bin/bash

# Скрипт быстрого запуска на VM
# Выполнять на VM 158.160.169.147

echo "=== Быстрый запуск Backend на VM ==="

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js не установлен. Устанавливаем..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Проверяем версию Node.js
echo "Версия Node.js: $(node --version)"
echo "Версия npm: $(npm --version)"

# Проверяем наличие PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL не установлен. Устанавливаем..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Проверяем статус PostgreSQL
echo "Проверяем статус PostgreSQL..."
sudo systemctl status postgresql --no-pager

# Создаем базу данных если её нет
echo "Проверяем базу данных..."
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw support_db; then
    echo "Создаем базу данных support_db..."
    sudo -u postgres createdb support_db
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
fi

# Проверяем подключение к БД
echo "Проверяем подключение к БД..."
sudo -u postgres psql -d support_db -c "SELECT NOW();"

# Переходим в директорию проекта
cd /home/dankartsev/bot-test/packages/backend

# Устанавливаем зависимости
echo "Устанавливаем зависимости..."
npm install

# Собираем проект
echo "Собираем проект..."
npm run build

# Настраиваем базу данных
echo "Настраиваем базу данных..."
npm run setup-db

# Запускаем backend
echo "Запускаем backend..."
npm run start
