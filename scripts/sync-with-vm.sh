#!/bin/bash

# Скрипт автоматической синхронизации с VM
# Синхронизирует изменения между локальным ПК и VM

ACTION=${1:-"sync"} # sync, pull, push, status
VM_USER=${2:-"dankartsev"}
VM_IP=${3:-"84.201.146.125"}
VM_PROJECT_PATH=${4:-"~/bot-project"}

echo "🔄 Синхронизация с VM..."
echo "VM: $VM_USER@$VM_IP:$VM_PROJECT_PATH"

# Функция для выполнения SSH команд
invoke_ssh_command() {
    local command="$1"
    ssh -l "$VM_USER" "$VM_IP" "$command" 2>&1
}

# Функция для копирования файлов на VM
copy_to_vm() {
    local local_path="$1"
    local remote_path="$2"
    echo "📤 Копирование $local_path на VM..."
    if scp -r "$local_path" "$VM_USER@$VM_IP:$remote_path"; then
        echo "✅ Файл скопирован"
    else
        echo "❌ Ошибка копирования"
    fi
}

# Функция для копирования файлов с VM
copy_from_vm() {
    local remote_path="$1"
    local local_path="$2"
    echo "📥 Копирование $remote_path с VM..."
    if scp -r "$VM_USER@$VM_IP:$remote_path" "$local_path"; then
        echo "✅ Файл скопирован"
    else
        echo "❌ Ошибка копирования"
    fi
}

case "$ACTION" in
    "sync")
        echo "🔄 Начинаем синхронизацию..."
        
        # 1. Копируем изменения с локального ПК на VM
        echo "📤 Отправляем изменения на VM..."
        
        # Копируем основные файлы
        files_to_sync=("src" "packages" "scripts" "package.json" "tsconfig.json" "env-template.txt")
        
        for file in "${files_to_sync[@]}"; do
            if [ -e "$file" ]; then
                copy_to_vm "$file" "$VM_PROJECT_PATH"
            fi
        done
        
        # 2. Копируем изменения с VM на локальный ПК
        echo "📥 Получаем изменения с VM..."
        
        # Создаем папку для изменений с VM
        mkdir -p vm-changes
        
        # Копируем файлы, которые могли измениться на VM
        vm_files_to_sync=("dist/admin" "dist/app" "dist/admin-server.cjs" "dist/ecosystem.config.cjs" "dist/.env")
        
        for file in "${vm_files_to_sync[@]}"; do
            copy_from_vm "$VM_PROJECT_PATH/$file" "vm-changes/"
        done
        
        echo "✅ Синхронизация завершена!"
        ;;
    
    "push")
        echo "📤 Отправляем изменения на VM..."
        
        # Создаем архив с изменениями
        timestamp=$(date +"%Y%m%d-%H%M%S")
        archive_name="sync-$timestamp.tar.gz"
        
        echo "📦 Создаем архив: $archive_name"
        tar -czf "$archive_name" src packages scripts package.json tsconfig.json
        
        # Копируем архив на VM
        copy_to_vm "$archive_name" "$VM_PROJECT_PATH"
        
        # Распаковываем на VM
        echo "📦 Распаковываем на VM..."
        invoke_ssh_command "cd $VM_PROJECT_PATH && tar -xzf $archive_name && rm $archive_name"
        
        # Устанавливаем зависимости
        echo "📦 Устанавливаем зависимости..."
        invoke_ssh_command "cd $VM_PROJECT_PATH && npm install"
        
        # Перезапускаем сервисы
        echo "🔄 Перезапускаем сервисы..."
        invoke_ssh_command "pm2 restart all"
        
        # Удаляем локальный архив
        rm "$archive_name"
        
        echo "✅ Изменения отправлены на VM!"
        ;;
    
    "pull")
        echo "📥 Получаем изменения с VM..."
        
        # Создаем папку для изменений с VM
        mkdir -p vm-changes
        
        # Копируем файлы с VM
        copy_from_vm "$VM_PROJECT_PATH/dist" "vm-changes/"
        copy_from_vm "$VM_PROJECT_PATH/.env" "vm-changes/"
        copy_from_vm "$VM_PROJECT_PATH/ecosystem.config.cjs" "vm-changes/"
        
        echo "✅ Изменения получены с VM!"
        echo "📁 Файлы сохранены в папке vm-changes/"
        ;;
    
    "status")
        echo "📊 Статус синхронизации..."
        
        # Проверяем статус локального Git
        echo "🔍 Локальный Git статус:"
        git status --porcelain
        
        # Проверяем статус на VM
        echo "🔍 VM статус:"
        invoke_ssh_command "cd $VM_PROJECT_PATH && git status --porcelain 2>/dev/null || echo 'Git не инициализирован'"
        
        # Проверяем статус PM2
        echo "🔍 PM2 статус:"
        invoke_ssh_command "pm2 status 2>/dev/null || echo 'PM2 не запущен'"
        ;;
    
    *)
        echo "❌ Неизвестное действие: $ACTION"
        echo "Доступные действия: sync, push, pull, status"
        exit 1
        ;;
esac

echo "🎯 Синхронизация завершена!"
