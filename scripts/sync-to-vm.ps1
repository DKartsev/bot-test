# Скрипт синхронизации с VM
# Использование: .\scripts\sync-to-vm.ps1

param(
    [string]$VM_IP = "84.201.146.125",
    [string]$VM_USER = "dankartsev",
    [string]$BRANCH = "main"
)

Write-Host "🚀 Начинаем синхронизацию с VM..." -ForegroundColor Green

# Проверяем статус Git
Write-Host "📋 Проверяем статус Git..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  Обнаружены несохраненные изменения:" -ForegroundColor Yellow
    Write-Host $gitStatus
    $response = Read-Host "Продолжить без коммита? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "❌ Синхронизация отменена" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Все изменения сохранены" -ForegroundColor Green
}

# Проверяем подключение к VM
Write-Host "🔍 Проверяем подключение к VM ($VM_IP)..." -ForegroundColor Yellow
try {
    $pingResult = Test-NetConnection -ComputerName $VM_IP -Port 22 -InformationLevel Quiet
    if ($pingResult) {
        Write-Host "✅ Подключение к VM доступно" -ForegroundColor Green
    } else {
        Write-Host "❌ Не удается подключиться к VM по SSH (порт 22)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Ошибка при проверке подключения к VM: $_" -ForegroundColor Red
    exit 1
}

# Пушим изменения в Git
Write-Host "📤 Пушим изменения в Git..." -ForegroundColor Yellow
try {
    git add .
    git commit -m "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git push origin $BRANCH
    Write-Host "✅ Изменения запушены в Git" -ForegroundColor Green
} catch {
    Write-Host "❌ Ошибка при пуше в Git: $_" -ForegroundColor Red
    exit 1
}

# Синхронизируем с VM
Write-Host "🔄 Синхронизируем с VM..." -ForegroundColor Yellow
try {
    # Создаем архив для передачи
    $archiveName = "bot-sync-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
    Write-Host "📦 Создаем архив: $archiveName" -ForegroundColor Yellow
    
    # Исключаем ненужные файлы
    $excludeFiles = @(
        "node_modules",
        ".git",
        "logs",
        "data",
        "dist-for-vm*",
        "*.tar.gz",
        "*.zip"
    )
    
    $excludeArgs = $excludeFiles | ForEach-Object { "--exclude=$_" }
    
    # Создаем архив
    tar -czf $archiveName $excludeArgs .
    
    if (Test-Path $archiveName) {
        Write-Host "✅ Архив создан: $archiveName" -ForegroundColor Green
        
        # Копируем архив на VM
        Write-Host "📤 Копируем архив на VM..." -ForegroundColor Yellow
        scp -o StrictHostKeyChecking=no $archiveName "${VM_USER}@${VM_IP}:/tmp/"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Архив скопирован на VM" -ForegroundColor Green
            
            # Выполняем команды на VM
            Write-Host "🔧 Выполняем команды на VM..." -ForegroundColor Yellow
            
            $vmCommands = @"
# Останавливаем текущие сервисы
cd ~/bot-test
docker-compose down

# Создаем бэкап текущей версии
if [ -d "backup" ]; then
    rm -rf backup
fi
mkdir -p backup
cp -r * backup/ 2>/dev/null || true

# Распаковываем новый архив
cd ~
rm -rf bot-test-new
mkdir bot-test-new
cd bot-test-new
tar -xzf /tmp/$archiveName

# Останавливаем старые контейнеры если они запущены
docker-compose down 2>/dev/null || true

# Собираем и запускаем новые образы
docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev build
docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev up -d

# Проверяем статус
docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev ps

# Очищаем временные файлы
rm -f /tmp/$archiveName

echo "✅ Синхронизация завершена успешно!"
"@
            
            # Выполняем команды на VM
            ssh -o StrictHostKeyChecking=no "${VM_USER}@${VM_IP}" $vmCommands
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Синхронизация с VM завершена успешно!" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Синхронизация завершена с предупреждениями" -ForegroundColor Yellow
            }
            
        } else {
            Write-Host "❌ Ошибка при копировании архива на VM" -ForegroundColor Red
        }
        
        # Удаляем локальный архив
        Remove-Item $archiveName -Force
        Write-Host "🗑️  Локальный архив удален" -ForegroundColor Yellow
        
    } else {
        Write-Host "❌ Ошибка при создании архива" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Ошибка при синхронизации с VM: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Синхронизация завершена!" -ForegroundColor Green
Write-Host "📱 Проверьте статус сервисов на VM командой: ssh ${VM_USER}@${VM_IP} 'cd ~/bot-test && docker-compose ps'" -ForegroundColor Cyan
