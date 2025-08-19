# Автоматический скрипт деплоя на VM
# Использование: .\scripts\auto-deploy.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$VMIP,
    
    [Parameter(Mandatory=$true)]
    [string]$SSHKeyPath,
    
    [string]$VMUser = "dankartsev",
    [string]$ProjectPath = "~/bot-project",
    [switch]$Watch,
    [switch]$Force
)

# Цвета для вывода
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

Write-Host "🚀 Автоматический деплой на VM $VMIP" -ForegroundColor $Green
Write-Host ""

# Функция для выполнения команды на VM
function Invoke-VMCommand {
    param([string]$Command, [string]$Description)
    
    Write-Host "📡 $Description..." -ForegroundColor $Blue
    Write-Host "Команда: $Command" -ForegroundColor $White
    
    try {
        $result = ssh -i $SSHKeyPath "${VMUser}@${VMIP}" $Command 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Description выполнено успешно" -ForegroundColor $Green
            return $result
        } else {
            Write-Host "❌ $Description завершилось с ошибкой" -ForegroundColor $Red
            Write-Host "Ошибка: $result" -ForegroundColor $Red
            return $false
        }
    } catch {
        Write-Host "❌ Ошибка выполнения команды: $($_.Exception.Message)" -ForegroundColor $Red
        return $false
    }
}

# Функция для копирования файлов на VM
function Copy-ToVM {
    param([string]$Source, [string]$Destination)
    
    Write-Host "📤 Копирование $Source на VM..." -ForegroundColor $Blue
    
    try {
        $result = scp -i $SSHKeyPath $Source "${VMUser}@${VMIP}:$Destination" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Файл скопирован успешно" -ForegroundColor $Green
            return $true
        } else {
            Write-Host "❌ Ошибка копирования: $result" -ForegroundColor $Red
            return $false
        }
    } catch {
        Write-Host "❌ Ошибка копирования: $($_.Exception.Message)" -ForegroundColor $Red
        return $false
    }
}

# Функция для деплоя
function Deploy-ToVM {
    Write-Host "🔄 Начинаем деплой..." -ForegroundColor $Yellow
    
    # Шаг 1: Очистка и сборка
    Write-Host "📦 Очистка и сборка проекта..." -ForegroundColor $Blue
    if (-not (Test-Path "dist")) {
        Write-Host "❌ Директория dist не найдена. Выполните сборку проекта сначала." -ForegroundColor $Red
        return $false
    }
    
    # Шаг 2: Создание архива
    Write-Host "📦 Создание архива для деплоя..." -ForegroundColor $Blue
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $archiveName = "deploy-${timestamp}.zip"
    
    try {
        Compress-Archive -Path "dist" -DestinationPath $archiveName -Force
        Write-Host "✅ Архив создан: $archiveName" -ForegroundColor $Green
    } catch {
        Write-Host "❌ Ошибка создания архива: $($_.Exception.Message)" -ForegroundColor $Red
        return $false
    }
    
    # Шаг 3: Копирование архива на VM
    if (-not (Copy-ToVM $archiveName "$ProjectPath/")) {
        return $false
    }
    
    # Шаг 4: Распаковка на VM
    Write-Host "📦 Распаковка архива на VM..." -ForegroundColor $Blue
    $deployCommands = @(
        "cd $ProjectPath",
        "rm -rf dist-old",
        "if [ -d 'dist' ]; then mv dist dist-old; fi",
        "unzip -o $archiveName",
        "rm $archiveName"
    )
    
    $deployScript = $deployCommands -join " ; "
    if (-not (Invoke-VMCommand $deployScript "Unpacking archive")) {
        return $false
    }
    
    # Шаг 5: Установка зависимостей
    Write-Host "📦 Установка зависимостей..." -ForegroundColor $Blue
    $installCommands = @(
        "cd $ProjectPath/dist",
        "npm ci --production"
    )
    
    $installScript = $installCommands -join " && "
    if (-not (Invoke-VMCommand $installScript "Установка зависимостей")) {
        return $false
    }
    
    # Шаг 6: Перезапуск сервисов
    Write-Host "🔄 Перезапуск сервисов..." -ForegroundColor $Blue
    $restartCommands = @(
        "pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js",
        "pm2 save"
    )
    
    $restartScript = $restartCommands -join " && "
    if (-not (Invoke-VMCommand $restartScript "Перезапуск сервисов")) {
        return $false
    }
    
    # Шаг 7: Проверка статуса
    Write-Host "🔍 Проверка статуса сервисов..." -ForegroundColor $Blue
    $status = Invoke-VMCommand "pm2 status" "Проверка статуса PM2"
    if ($status) {
        Write-Host "📊 Статус PM2:" -ForegroundColor $Blue
        Write-Host $status -ForegroundColor $White
    }
    
    # Шаг 8: Очистка локального архива
    Remove-Item $archiveName -Force
    Write-Host "✅ Локальный архив удален" -ForegroundColor $Green
    
    Write-Host "🎉 Деплой завершен успешно!" -ForegroundColor $Green
    return $true
}

# Функция для мониторинга изменений
function Watch-AndDeploy {
    Write-Host "👀 Режим мониторинга изменений..." -ForegroundColor $Yellow
    Write-Host "Нажмите Ctrl+C для остановки" -ForegroundColor $White
    Write-Host ""
    
    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = "."
    $watcher.IncludeSubdirectories = $true
    $watcher.EnableRaisingEvents = $true
    
    $action = {
        $path = $Event.SourceEventArgs.FullPath
        $changeType = $Event.SourceEventArgs.ChangeType
        $timestamp = Get-Date -Format "HH:mm:ss"
        
        # Игнорируем временные файлы
        if ($path -match "\.(tmp|log|zip|tar\.gz)$|node_modules|dist|\.git") {
            return
        }
        
        Write-Host "[$timestamp] $changeType`: $path" -ForegroundColor $Yellow
        
        # Ждем немного, чтобы изменения завершились
        Start-Sleep -Seconds 2
        
        # Запускаем деплой
        Write-Host "🔄 Запуск автоматического деплоя..." -ForegroundColor $Blue
        Deploy-ToVM
    }
    
    # Подписываемся на события
    Register-ObjectEvent $watcher "Changed" -Action $action | Out-Null
    Register-ObjectEvent $watcher "Created" -Action $action | Out-Null
    Register-ObjectEvent $watcher "Deleted" -Action $action | Out-Null
    Register-ObjectEvent $watcher "Renamed" -Action $action | Out-Null
    
    try {
        Write-Host "👀 Ожидание изменений в файлах..." -ForegroundColor $Green
        while ($true) {
            Start-Sleep -Seconds 1
        }
    } finally {
        # Очистка
        Unregister-Event -SourceIdentifier $action.Name -ErrorAction SilentlyContinue
        $watcher.EnableRaisingEvents = $false
        $watcher.Dispose()
    }
}

# Основная логика
try {
    # Проверка параметров
    if (-not (Test-Path $SSHKeyPath)) {
        Write-Host "❌ SSH ключ не найден: $SSHKeyPath" -ForegroundColor $Red
        exit 1
    }
    
    # Проверка подключения к VM
    Write-Host "🔍 Проверка подключения к VM..." -ForegroundColor $Blue
    $connectionTest = Invoke-VMCommand "echo 'Connection OK'" "Проверка подключения"
    if (-not $connectionTest) {
        Write-Host "❌ Не удается подключиться к VM. Проверьте IP адрес и SSH ключ." -ForegroundColor $Red
        exit 1
    }
    
    Write-Host "✅ Подключение к VM установлено" -ForegroundColor $Green
    
    if ($Watch) {
        # Режим мониторинга
        Watch-AndDeploy
    } else {
        # Одноразовый деплой
        Deploy-ToVM
    }
    
} catch {
    Write-Host "❌ Критическая ошибка: $($_.Exception.Message)" -ForegroundColor $Red
    exit 1
}
