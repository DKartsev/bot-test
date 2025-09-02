#!/bin/bash

# Скрипт для развертывания на VM
VM_HOST="158.160.169.147"
VM_USER="root"
PROJECT_DIR="/root/bot-test"

echo "🚀 Начинаем развертывание на VM $VM_HOST..."

# Функция для выполнения команд на VM
run_on_vm() {
    ssh $VM_USER@$VM_HOST "cd $PROJECT_DIR && $1"
}

# 1. Получаем последние изменения
echo "📥 Получаем последние изменения из Git..."
run_on_vm "git pull origin main"

# 2. Создаем docker.env если его нет
echo "📄 Проверяем docker.env..."
run_on_vm "if [ ! -f docker.env ]; then cp docker.env.example docker.env; echo 'docker.env создан из шаблона'; else echo 'docker.env уже существует'; fi"

# 3. Останавливаем контейнеры
echo "🛑 Останавливаем контейнеры..."
run_on_vm "docker-compose down"

# 4. Пересобираем и запускаем контейнеры
echo "🔨 Пересобираем и запускаем контейнеры..."
run_on_vm "docker-compose up --build -d"

# 5. Ждем запуска
echo "⏳ Ждем запуска сервисов..."
sleep 10

# 6. Проверяем статус контейнеров
echo "📊 Проверяем статус контейнеров..."
run_on_vm "docker-compose ps"

# 7. Тестируем API
echo "🧪 Тестируем RAG API..."
curl -s http://$VM_HOST:3000/api/supabase-rag/health && echo "✅ Health check успешен" || echo "❌ Health check не удался"

echo "🎉 Развертывание завершено!"
echo ""
echo "📋 Полезные команды для проверки:"
echo "ssh $VM_USER@$VM_HOST 'cd $PROJECT_DIR && docker-compose logs -f bot-backend'"
echo "ssh $VM_USER@$VM_HOST 'cd $PROJECT_DIR && docker-compose logs -f bot-admin'"
echo ""
echo "🔗 Проверьте сервисы:"
echo "Backend: http://$VM_HOST:3000"
echo "Admin: http://$VM_HOST:3001"
echo "RAG Health: http://$VM_HOST:3000/api/supabase-rag/health"
