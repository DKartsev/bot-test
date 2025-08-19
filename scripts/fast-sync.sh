#!/bin/bash

# Быстрый скрипт синхронизации с VM
ACTION=${1:-"status"}
VM_USER=${2:-"dankartsev"}
VM_IP=${3:-"84.201.146.125"}
VM_PROJECT_PATH=${4:-"~/bot-project"}

echo "🔄 Быстрая синхронизация с VM..."
echo "VM: $VM_USER@$VM_IP:$VM_PROJECT_PATH"

case "$ACTION" in
    "status")
        echo "📊 Статус синхронизации..."
        
        # Проверяем статус локального Git
        echo "🔍 Локальный Git статус:"
        git status --porcelain
        
        # Проверяем статус на VM
        echo "🔍 VM статус:"
        ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && echo 'VM доступна'"
        
        # Проверяем статус PM2
        echo "🔍 PM2 статус:"
        ssh -l "$VM_USER" "$VM_IP" "pm2 status"
        ;;
    
    "push")
        echo "📤 Отправляем изменения на VM..."
        
        # Создаем архив только с нужными файлами
        timestamp=$(date +"%Y%m%d-%H%M%S")
        archive_name="fast-sync-$timestamp.tar.gz"
        
        echo "📦 Создаем оптимизированный архив: $archive_name"
        
        # Только основные файлы без node_modules
        tar -czf "$archive_name" \
            --exclude='node_modules' \
            --exclude='*.log' \
            --exclude='*.zip' \
            --exclude='*.tar.gz' \
            --exclude='dist' \
            src packages scripts package.json tsconfig.json env-template.txt 2>/dev/null
        
        if [ -f "$archive_name" ]; then
            # Копируем на VM
            echo "📤 Копируем на VM..."
            scp "$archive_name" "$VM_USER@$VM_IP:$VM_PROJECT_PATH/"
            
            # Распаковываем на VM
            echo "📦 Распаковываем на VM..."
            ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && tar -xzf $archive_name && rm $archive_name"
            
            # Перезапускаем сервисы
            echo "🔄 Перезапускаем сервисы..."
            ssh -l "$VM_USER" "$VM_IP" "pm2 restart all"
            
            # Удаляем локальный архив
            rm "$archive_name"
            
            echo "✅ Изменения отправлены на VM!"
        else
            echo "⚠️ Нет файлов для синхронизации"
        fi
        ;;
    
    "pull")
        echo "📥 Получаем изменения с VM..."
        
        # Создаем папку
        mkdir -p vm-changes
        
        # Создаем временный архив на VM с нужными файлами
        echo "📦 Создаем архив на VM..."
        ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && tar -czf vm-changes.tar.gz --exclude='node_modules' --exclude='*.log' --exclude='*.zip' --exclude='*.tar.gz' dist/ .env ecosystem.config.cjs"
        
        # Копируем архив
        echo "📥 Копируем архив..."
        scp "$VM_USER@$VM_IP:$VM_PROJECT_PATH/vm-changes.tar.gz" "vm-changes/"
        
        # Распаковываем локально
        echo "📦 Распаковываем локально..."
        cd vm-changes
        tar -xzf vm-changes.tar.gz
        rm vm-changes.tar.gz
        cd ..
        
        # Удаляем архив с VM
        ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && rm -f vm-changes.tar.gz"
        
        echo "✅ Изменения получены с VM!"
        echo "📁 Файлы сохранены в папке vm-changes/"
        ;;
    
    "quick-pull")
        echo "⚡ Быстрое получение изменений..."
        
        # Создаем папку
        mkdir -p vm-changes
        
        # Копируем только самые важные файлы
        echo "📥 Копируем ключевые файлы..."
        
        key_files=(
            "dist/admin/index.html"
            "dist/admin-server.cjs"
            "dist/ecosystem.config.cjs"
            "dist/.env"
        )
        
        for file in "${key_files[@]}"; do
            local_path="vm-changes/$(basename "$file")"
            echo "📥 $file -> $local_path"
            scp "$VM_USER@$VM_IP:$VM_PROJECT_PATH/$file" "$local_path"
        done
        
        echo "✅ Ключевые файлы получены!"
        ;;
    
    *)
        echo "❌ Неизвестное действие: $ACTION"
        echo "Доступные действия: status, push, pull, quick-pull"
        exit 1
        ;;
esac

echo "🎯 Синхронизация завершена!"
