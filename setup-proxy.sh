#!/bin/bash

# Настройка прокси для Docker контейнера
echo "🔧 Настройка прокси для бота..."

# Останавливаем контейнер
docker-compose stop bot-backend

# Создаем .env файл с настройками прокси
cat > .env << 'EOF'
# Прокси настройки
ALL_PROXY=socks5://127.0.0.1:1080
HTTP_PROXY=socks5://127.0.0.1:1080
HTTPS_PROXY=socks5://127.0.0.1:1080

# Существующие переменные
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:your_password@158.160.169.147:5432/support_db
REDIS_URL=redis://158.160.169.147:6379
TG_BOT_TOKEN=8466377396:AAGOt2PImCCeFkC3vEIsM7KISv87Lpj9OhY
OPENAI_API_KEY=your_openai_key_here
EOF

echo "✅ .env файл создан с настройками прокси"

# Запускаем контейнер
docker-compose up -d bot-backend

echo "🚀 Бот перезапущен с настройками прокси"
