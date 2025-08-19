# Быстрый скрипт синхронизации с VM
param(
    [string]$Action = "status"
)

$VMUser = "dankartsev"
$VMIP = "84.201.146.125"
$VMProjectPath = "~/bot-project"

Write-Host "🔄 Быстрая синхронизация с VM..." -ForegroundColor Green
Write-Host "VM: ${VMUser}@${VMIP}:${VMProjectPath}" -ForegroundColor Blue

switch ($Action.ToLower()) {
    "status" {
        Write-Host "📊 Статус синхронизации..." -ForegroundColor Blue
        
        # Проверяем статус локального Git
        Write-Host "🔍 Локальный Git статус:" -ForegroundColor Yellow
        git status --porcelain
        
        # Проверяем статус на VM
        Write-Host "🔍 VM статус:" -ForegroundColor Yellow
        ssh -l $VMUser $VMIP "cd $VMProjectPath ; echo 'VM доступна'"
        
        # Проверяем статус PM2
        Write-Host "🔍 PM2 статус:" -ForegroundColor Yellow
        ssh -l $VMUser $VMIP "pm2 status"
    }
    
    "push" {
        Write-Host "📤 Отправляем изменения на VM..." -ForegroundColor Blue
        
        # Создаем архив только с нужными файлами
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $archiveName = "fast-sync-$timestamp.zip"
        
        Write-Host "📦 Создаем оптимизированный архив: $archiveName" -ForegroundColor Yellow
        
        # Только основные файлы без node_modules
        $filesToSync = @(
            "src",
            "packages", 
            "scripts",
            "package.json",
            "tsconfig.json",
            "env-template.txt"
        )
        
        # Фильтруем существующие файлы
        $existingFiles = $filesToSync | Where-Object { Test-Path $_ }
        
        if ($existingFiles.Count -gt 0) {
            Compress-Archive -Path $existingFiles -DestinationPath $archiveName -Force
            
            # Копируем на VM
            Write-Host "📤 Копируем на VM..." -ForegroundColor Yellow
            scp $archiveName "${VMUser}@${VMIP}:${VMProjectPath}/"
            
            # Распаковываем на VM
            Write-Host "📦 Распаковываем на VM..." -ForegroundColor Yellow
            ssh -l $VMUser $VMIP "cd $VMProjectPath ; unzip -o $archiveName ; rm $archiveName"
            
            # Перезапускаем сервисы
            Write-Host "🔄 Перезапускаем сервисы..." -ForegroundColor Yellow
            ssh -l $VMUser $VMIP "pm2 restart all"
            
            # Удаляем локальный архив
            Remove-Item $archiveName -Force
            
            Write-Host "✅ Изменения отправлены на VM!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Нет файлов для синхронизации" -ForegroundColor Yellow
        }
    }
    
    "pull" {
        Write-Host "📥 Получаем изменения с VM..." -ForegroundColor Blue
        
        # Создаем папку
        if (-not (Test-Path "vm-changes")) {
            New-Item -ItemType Directory -Name "vm-changes" -Force
        }
        
        # Копируем только важные файлы (без node_modules)
        Write-Host "📥 Копируем только важные файлы..." -ForegroundColor Yellow
        
        # Копируем только важные файлы по отдельности
        Write-Host "📥 Копируем важные файлы..." -ForegroundColor Yellow
        
        $importantFiles = @(
            "dist/admin",
            "dist/app",
            "dist/admin-server.cjs",
            "dist/ecosystem.config.cjs",
            ".env"
        )
        
        foreach ($file in $importantFiles) {
            $localPath = "vm-changes/$(Split-Path $file -Leaf)"
            Write-Host "📥 $file -> $localPath" -ForegroundColor Cyan
            try {
                scp -r "${VMUser}@${VMIP}:${VMProjectPath}/$file" $localPath
            } catch {
                Write-Host "⚠️ Не удалось скопировать $file" -ForegroundColor Yellow
            }
        }
        
        Write-Host "✅ Изменения получены с VM!" -ForegroundColor Green
        Write-Host "📁 Файлы сохранены в папке vm-changes/" -ForegroundColor Blue
    }
    
    "quick-pull" {
        Write-Host "⚡ Быстрое получение изменений..." -ForegroundColor Blue
        
        # Создаем папку
        if (-not (Test-Path "vm-changes")) {
            New-Item -ItemType Directory -Name "vm-changes" -Force
        }
        
        # Копируем только самые важные файлы
        Write-Host "📥 Копируем ключевые файлы..." -ForegroundColor Yellow
        
        $keyFiles = @(
            "dist/admin/index.html",
            "dist/admin-server.cjs", 
            "dist/ecosystem.config.cjs",
            "dist/.env"
        )
        
        foreach ($file in $keyFiles) {
            $localPath = "vm-changes/$(Split-Path $file -Leaf)"
            Write-Host "📥 $file -> $localPath" -ForegroundColor Cyan
            scp "${VMUser}@${VMIP}:${VMProjectPath}/$file" $localPath
        }
        
        Write-Host "✅ Ключевые файлы получены!" -ForegroundColor Green
    }
    
    default {
        Write-Host "❌ Неизвестное действие: $Action" -ForegroundColor Red
        Write-Host "Доступные действия: status, push, pull, quick-pull" -ForegroundColor Yellow
    }
}

Write-Host "🎯 Синхронизация завершена!" -ForegroundColor Green
