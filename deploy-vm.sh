#!/bin/bash

# Скрипт для быстрого деплоя на VM
# Использование: ./deploy-vm.sh [dev|prod]

MODE=${1:-dev}
VM_HOST="dankartsev@158.160.197.7"
VM_PATH="/home/dankartsev/bot-test"

echo "🚀 Деплой в режиме: $MODE"

# Синхронизируем код с VM
echo "📦 Синхронизация кода с VM..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '.env' \
  ./ $VM_HOST:$VM_PATH/

# Выполняем команды на VM
echo "🔄 Перезапуск сервисов на VM..."
ssh $VM_HOST "cd $VM_PATH && \
  git pull && \
  docker-compose down && \
  docker-compose up -d && \
  echo '✅ Деплой завершен'"

# Тестируем
echo "🧪 Тестирование..."
node restart-vm.cjs
