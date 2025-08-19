#!/bin/bash

# Git синхронизация между локальным ПК и VM
ACTION=${1:-"sync"} # sync, push, pull, status
VM_USER=${2:-"dankartsev"}
VM_IP=${3:-"84.201.146.125"}
VM_PROJECT_PATH=${4:-"~/bot-project"}

echo "🔄 Git синхронизация с VM..."
echo "VM: $VM_USER@$VM_IP:$VM_PROJECT_PATH"

case "$ACTION" in
    "sync")
        echo "🔄 Полная Git синхронизация..."
        
        # 1. Коммитим локальные изменения
        echo "1. Коммитим локальные изменения..."
        git add .
        timestamp=$(date "+%Y-%m-%d %H:%M:%S")
        git commit -m "Auto-sync: $timestamp"
        
        # 2. Пушим на удаленный репозиторий (если есть)
        echo "2. Отправляем изменения в удаленный репозиторий..."
        if git push origin main 2>/dev/null; then
            echo "✅ Изменения отправлены в удаленный репозиторий"
        else
            echo "⚠️ Удаленный репозиторий недоступен, продолжаем с локальным"
        fi
        
        # 3. Синхронизируем с VM
        echo "3. Синхронизируем с VM..."
        ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && git pull origin main 2>/dev/null || echo 'Удаленный репозиторий недоступен на VM'"
        
        echo "✅ Git синхронизация завершена!"
        ;;
    
    "push")
        echo "📤 Отправляем изменения через Git..."
        
        # Коммитим и пушим
        git add .
        timestamp=$(date "+%Y-%m-%d %H:%M:%S")
        git commit -m "Push to VM: $timestamp"
        git push origin main
        
        # Обновляем на VM
        ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && git pull origin main"
        
        echo "✅ Изменения отправлены на VM!"
        ;;
    
    "pull")
        echo "📥 Получаем изменения с VM через Git..."
        
        # Коммитим изменения на VM
        ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && git add . && git commit -m 'VM changes: \$(date)' && git push origin main"
        
        # Получаем локально
        git pull origin main
        
        echo "✅ Изменения получены с VM!"
        ;;
    
    "status")
        echo "📊 Git статус синхронизации..."
        
        # Локальный статус
        echo "🔍 Локальный Git статус:"
        git status --porcelain
        
        # Статус на VM
        echo "🔍 VM Git статус:"
        ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && git status --porcelain"
        
        # Проверяем синхронизацию
        echo "🔍 Проверяем синхронизацию..."
        local_commit=$(git rev-parse HEAD)
        vm_commit=$(ssh -l "$VM_USER" "$VM_IP" "cd $VM_PROJECT_PATH && git rev-parse HEAD")
        
        if [ "$local_commit" = "$vm_commit" ]; then
            echo "✅ Репозитории синхронизированы!"
        else
            echo "❌ Репозитории НЕ синхронизированы!"
            echo "Локальный коммит: $local_commit"
            echo "VM коммит: $vm_commit"
        fi
        ;;
    
    *)
        echo "❌ Неизвестное действие: $ACTION"
        echo "Доступные действия: sync, push, pull, status"
        exit 1
        ;;
esac

echo "🎯 Готово!"
