# Скрипт автоматической синхронизации с VM
# Синхронизирует изменения между локальным ПК и VM

param(
    [string]$Action = "sync", # sync, pull, push, status
    [string]$VMUser = "dankartsev",
    [string]$VMIP = "84.201.146.125",
    [string]$VMProjectPath = "~/bot-project"
)

Write-Host "🔄 Синхронизация с VM..." -ForegroundColor Green
Write-Host "VM: ${VMUser}@${VMIP}:${VMProjectPath}" -ForegroundColor Blue

# Функция для выполнения SSH команд
function Invoke-SSHCommand {
    param([string]$Command)
    try {
        $result = ssh -l $VMUser $VMIP $Command 2>&1
        return $result
    } catch {
        Write-Host "❌ SSH ошибка: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Функция для копирования файлов на VM
function Copy-ToVM {
    param([string]$LocalPath, [string]$RemotePath)
    try {
        Write-Host "📤 Копирование $LocalPath на VM..." -ForegroundColor Yellow
        scp -r $LocalPath "${VMUser}@${VMIP}:${RemotePath}"
        Write-Host "✅ Файл скопирован" -ForegroundColor Green
    } catch {
        Write-Host "❌ Ошибка копирования: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Функция для копирования файлов с VM
function Copy-FromVM {
    param([string]$RemotePath, [string]$LocalPath)
    try {
        Write-Host "📥 Копирование $RemotePath с VM..." -ForegroundColor Yellow
        scp -r "${VMUser}@${VMIP}:${RemotePath}" $LocalPath
        Write-Host "✅ Файл скопирован" -ForegroundColor Green
    } catch {
        Write-Host "❌ Ошибка копирования: $($_.Exception.Message)" -ForegroundColor Red
    }
}

switch ($Action.ToLower()) {
    "sync" {
        Write-Host "🔄 Начинаем синхронизацию..." -ForegroundColor Green
        
        # 1. Копируем изменения с локального ПК на VM
        Write-Host "📤 Отправляем изменения на VM..." -ForegroundColor Blue
        
        # Копируем основные файлы
        $filesToSync = @(
            "src",
            "packages", 
            "scripts",
            "package.json",
            "tsconfig.json",
            "env-template.txt"
        )
        
        foreach ($file in $filesToSync) {
            if (Test-Path $file) {
                Copy-ToVM $file $VMProjectPath
            }
        }
        
        # 2. Копируем изменения с VM на локальный ПК
        Write-Host "📥 Получаем изменения с VM..." -ForegroundColor Blue
        
        # Копируем файлы, которые могли измениться на VM
        $vmFilesToSync = @(
            "dist/admin",
            "dist/app",
            "dist/admin-server.cjs",
            "dist/ecosystem.config.cjs",
            "dist/.env"
        )
        
        foreach ($file in $vmFilesToSync) {
            Copy-FromVM "$VMProjectPath/$file" "vm-changes/"
        }
        
        Write-Host "✅ Синхронизация завершена!" -ForegroundColor Green
    }
    
    "push" {
        Write-Host "📤 Отправляем изменения на VM..." -ForegroundColor Blue
        
        # Создаем архив с изменениями
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $archiveName = "sync-$timestamp.zip"
        
        Write-Host "📦 Создаем архив: $archiveName" -ForegroundColor Yellow
        Compress-Archive -Path "src", "packages", "scripts", "package.json", "tsconfig.json" -DestinationPath $archiveName -Force
        
        # Копируем архив на VM
        Copy-ToVM $archiveName $VMProjectPath
        
        # Распаковываем на VM
        Write-Host "📦 Распаковываем на VM..." -ForegroundColor Yellow
        Invoke-SSHCommand "cd $VMProjectPath ; unzip -o $archiveName ; rm $archiveName"
        
        # Устанавливаем зависимости
        Write-Host "📦 Устанавливаем зависимости..." -ForegroundColor Yellow
        Invoke-SSHCommand "cd $VMProjectPath ; npm install"
        
        # Перезапускаем сервисы
        Write-Host "🔄 Перезапускаем сервисы..." -ForegroundColor Yellow
        Invoke-SSHCommand "pm2 restart all"
        
        # Удаляем локальный архив
        Remove-Item $archiveName -Force
        
        Write-Host "✅ Изменения отправлены на VM!" -ForegroundColor Green
    }
    
    "pull" {
        Write-Host "📥 Получаем изменения с VM..." -ForegroundColor Blue
        
        # Создаем папку для изменений с VM
        if (-not (Test-Path "vm-changes")) {
            New-Item -ItemType Directory -Name "vm-changes" -Force
        }
        
        # Копируем файлы с VM
        Copy-FromVM "$VMProjectPath/dist" "vm-changes/"
        Copy-FromVM "$VMProjectPath/.env" "vm-changes/"
        Copy-FromVM "$VMProjectPath/ecosystem.config.cjs" "vm-changes/"
        
        Write-Host "✅ Изменения получены с VM!" -ForegroundColor Green
        Write-Host "📁 Файлы сохранены в папке vm-changes/" -ForegroundColor Blue
    }
    
    "status" {
        Write-Host "📊 Статус синхронизации..." -ForegroundColor Blue
        
        # Проверяем статус локального Git
        Write-Host "🔍 Локальный Git статус:" -ForegroundColor Yellow
        git status --porcelain
        
        # Проверяем статус на VM
        Write-Host "🔍 VM статус:" -ForegroundColor Yellow
        Invoke-SSHCommand "cd $VMProjectPath ; git status --porcelain 2>/dev/null ; if [ $? -ne 0 ]; then echo 'Git не инициализирован'; fi"
        
        # Проверяем статус PM2
        Write-Host "🔍 PM2 статус:" -ForegroundColor Yellow
        Invoke-SSHCommand "pm2 status 2>/dev/null ; if [ $? -ne 0 ]; then echo 'PM2 не запущен'; fi"
    }
    
    default {
        Write-Host "❌ Неизвестное действие: $Action" -ForegroundColor Red
        Write-Host "Доступные действия: sync, push, pull, status" -ForegroundColor Yellow
    }
}

Write-Host "🎯 Синхронизация завершена!" -ForegroundColor Green
