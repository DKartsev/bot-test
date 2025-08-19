# Простая Git синхронизация
param([string]$Action = "sync")

$VMUser = "dankartsev"
$VMIP = "84.201.146.125"
$VMProjectPath = "~/bot-project"

Write-Host "Git синхронизация с VM..." -ForegroundColor Green

if ($Action -eq "sync") {
    Write-Host "Полная Git синхронизация..." -ForegroundColor Blue
    
    # 1. Коммитим локальные изменения
    Write-Host "1. Коммитим локальные изменения..." -ForegroundColor Yellow
    git add .
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Auto-sync: $timestamp"
    
    # 2. Пушим на удаленный репозиторий
    Write-Host "2. Отправляем изменения в удаленный репозиторий..." -ForegroundColor Yellow
    git push origin main
    
    # 3. Синхронизируем с VM
    Write-Host "3. Синхронизируем с VM..." -ForegroundColor Yellow
    ssh -l $VMUser $VMIP "cd $VMProjectPath ; git pull origin main"
    
    Write-Host "Git синхронизация завершена!" -ForegroundColor Green
}
elseif ($Action -eq "status") {
    Write-Host "Git статус синхронизации..." -ForegroundColor Blue
    
    # Локальный статус
    Write-Host "Локальный Git статус:" -ForegroundColor Yellow
    git status --porcelain
    
    # Статус на VM
    Write-Host "VM Git статус:" -ForegroundColor Yellow
    ssh -l $VMUser $VMIP "cd $VMProjectPath ; git status --porcelain"
}
else {
    Write-Host "Неизвестное действие: $Action" -ForegroundColor Red
    Write-Host "Доступные действия: sync, status" -ForegroundColor Yellow
}

Write-Host "Готово!" -ForegroundColor Green
