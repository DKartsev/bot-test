#!/bin/bash

echo "🔄 Перезапуск сервисов на VM..."

# Перейти в директорию проекта
cd /home/dankartsev/bot-test

echo "📁 Текущая директория: $(pwd)"

# Получить последние изменения
echo "📥 Получение последних изменений..."
git pull origin main

# Остановить контейнеры
echo "⏹️ Остановка контейнеров..."
docker-compose down

# Пересобрать и запустить контейнеры
echo "🔨 Пересборка и запуск контейнеров..."
docker-compose up -d --build

# Проверить статус контейнеров
echo "📊 Статус контейнеров:"
docker ps

# Проверить логи backend
echo "📋 Логи backend (последние 20 строк):"
docker-compose logs --tail=20 backend

echo "✅ Перезапуск завершен!"
