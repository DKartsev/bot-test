# Git синхронизация между локальным ПК и VM
param(
    [string]$Action = "sync" # sync, push, pull, status
)

$VMUser = "dankartsev"
$VMIP = "84.201.146.125"
$VMProjectPath = "~/bot-project"

Write-Host "Git синхронизация с VM..." -ForegroundColor Green
Write-Host "VM: ${VMUser}@${VMIP}:${VMProjectPath}" -ForegroundColor Blue

switch ($Action.ToLower()) {
    "sync" {
        Write-Host "Полная Git синхронизация..." -ForegroundColor Blue
        
        # 1. Коммитим локальные изменения
        Write-Host "1. Коммитим локальные изменения..." -ForegroundColor Yellow
        git add .
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        git commit -m "Auto-sync: $timestamp"
        
        # 2. Пушим на удаленный репозиторий (если есть)
        Write-Host "2. Отправляем изменения в удаленный репозиторий..." -ForegroundColor Yellow
        git push origin main 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Изменения отправлены в удаленный репозиторий" -ForegroundColor Green
        } else {
            Write-Host "Удаленный репозиторий недоступен, продолжаем с локальным" -ForegroundColor Yellow
        }
        
        # 3. Синхронизируем с VM
        Write-Host "3. Синхронизируем с VM..." -ForegroundColor Yellow
        ssh -l $VMUser $VMIP "cd $VMProjectPath && git pull origin main 2>/dev/null || echo 'Удаленный репозиторий недоступен на VM'"
        
        Write-Host "Git синхронизация завершена!" -ForegroundColor Green
    }
    
    "push" {
        Write-Host "Отправляем изменения через Git..." -ForegroundColor Blue
        
        # Коммитим и пушим
        git add .
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        git commit -m "Push to VM: $timestamp"
        git push origin main
        
        # Обновляем на VM
        ssh -l $VMUser $VMIP "cd $VMProjectPath && git pull origin main"
        
        Write-Host "Изменения отправлены на VM!" -ForegroundColor Green
    }
    
    "pull" {
        Write-Host "Получаем изменения с VM через Git..." -ForegroundColor Blue
        
        # Коммитим изменения на VM
        ssh -l $VMUser $VMIP "cd $VMProjectPath && git add . && git commit -m 'VM changes: $(date)' && git push origin main"
        
        # Получаем локально
        git pull origin main
        
        Write-Host "Изменения получены с VM!" -ForegroundColor Green
    }
    
    "status" {
        Write-Host "Git статус синхронизации..." -ForegroundColor Blue
        
        # Локальный статус
        Write-Host "Локальный Git статус:" -ForegroundColor Yellow
        git status --porcelain
        
        # Статус на VM
        Write-Host "VM Git статус:" -ForegroundColor Yellow
        ssh -l $VMUser $VMIP "cd $VMProjectPath && git status --porcelain"
        
        # Проверяем синхронизацию
        Write-Host "Проверяем синхронизацию..." -ForegroundColor Yellow
        $localCommit = git rev-parse HEAD
        $vmCommit = ssh -l $VMUser $VMIP "cd $VMProjectPath && git rev-parse HEAD"
        
        if ($localCommit -eq $vmCommit) {
            Write-Host "Репозитории синхронизированы!" -ForegroundColor Green
        } else {
            Write-Host "Репозитории НЕ синхронизированы!" -ForegroundColor Red
            Write-Host "Локальный коммит: $localCommit" -ForegroundColor White
            Write-Host "VM коммит: $vmCommit" -ForegroundColor White
        }
    }
    
    default {
        Write-Host "Неизвестное действие: $Action" -ForegroundColor Red
        Write-Host "Доступные действия: sync, push, pull, status" -ForegroundColor Yellow
    }
}

Write-Host "Готово!" -ForegroundColor Green
