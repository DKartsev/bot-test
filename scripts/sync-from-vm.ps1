# Скрипт синхронизации изменений с VM на локальную машину
# Использование: .\scripts\sync-from-vm.ps1

Write-Host "=== Синхронизация изменений с VM ===" -ForegroundColor Green

# Проверяем, что мы в корне проекта
if (-not (Test-Path ".git")) {
    Write-Host "Ошибка: Скрипт должен запускаться из корня проекта" -ForegroundColor Red
    exit 1
}

# Получаем изменения с VM
Write-Host "Получаем изменения с VM..." -ForegroundColor Yellow
git fetch origin

# Проверяем, есть ли новые коммиты
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/main

if ($localCommit -eq $remoteCommit) {
    Write-Host "Локальный репозиторий уже синхронизирован с VM" -ForegroundColor Green
} else {
    Write-Host "Обнаружены новые изменения на VM, обновляем..." -ForegroundColor Yellow
    
    # Показываем новые коммиты
    Write-Host "Новые коммиты:" -ForegroundColor Cyan
    git log --oneline $localCommit..$remoteCommit
    
    # Обновляем локальный репозиторий
    git pull origin main
    
    Write-Host "Локальный репозиторий обновлен!" -ForegroundColor Green
}

# Показываем текущий статус
Write-Host "`nТекущий статус:" -ForegroundColor Cyan
git status --porcelain

Write-Host "`n=== Синхронизация завершена ===" -ForegroundColor Green
