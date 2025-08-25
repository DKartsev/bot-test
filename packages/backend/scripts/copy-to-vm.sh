#!/bin/bash

# Скрипт для копирования файлов на VM
# Выполнять локально

echo "=== Копирование файлов на VM ==="

VM_HOST="158.160.169.147"
VM_USER="dankartsev"
VM_PATH="/home/dankartsev/bot-test"

# Создаем архив с необходимыми файлами
echo "Создаем архив..."
tar -czf backend-files.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=logs \
    --exclude=uploads \
    --exclude=.git \
    .

# Копируем архив на VM
echo "Копируем архив на VM..."
scp backend-files.tar.gz ${VM_USER}@${VM_HOST}:~/

# Выполняем команды на VM
echo "Выполняем команды на VM..."
ssh ${VM_USER}@${VM_HOST} << 'EOF'
    # Останавливаем существующие процессы
    pkill -f "node.*backend" || true
    
    # Создаем директорию если её нет
    mkdir -p ${VM_PATH}
    cd ${VM_PATH}
    
    # Распаковываем архив
    tar -xzf ~/backend-files.tar.gz
    
    # Устанавливаем зависимости
    npm install
    
    # Собираем проект
    npm run build
    
    # Настраиваем базу данных
    npm run setup-db
    
    echo "Файлы успешно скопированы и настроены на VM"
EOF

# Удаляем локальный архив
rm backend-files.tar.gz

echo "=== Копирование завершено ==="
echo "Теперь на VM можно запустить: npm run start"
