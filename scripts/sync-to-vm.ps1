# Скрипт отправки локальных изменений на VM
# Использование: .\scripts\sync-to-vm.ps1

Write-Host "=== Отправка изменений на VM ===" -ForegroundColor Green

# Проверяем, что мы в корне проекта
if (-not (Test-Path ".git")) {
    Write-Host "Ошибка: Скрипт должен запускаться из корня проекта" -ForegroundColor Red
    exit 1
}

# Проверяем статус git
Write-Host "Проверяем статус git..." -ForegroundColor Yellow
$status = git status --porcelain

if (-not $status) {
    Write-Host "Изменений для отправки не обнаружено" -ForegroundColor Yellow
    exit 0
}

# Показываем изменения
Write-Host "Обнаружены изменения:" -ForegroundColor Cyan
git status --porcelain

# Спрашиваем пользователя о коммите
$commitMessage = Read-Host "Введите сообщение коммита (или нажмите Enter для автосообщения)"

if (-not $commitMessage) {
    $commitMessage = "[LOCAL] Автоматический коммит локальных изменений"
}

# Добавляем все изменения и коммитим
Write-Host "Коммитим изменения..." -ForegroundColor Yellow
git add .
git commit -m $commitMessage

# Отправляем на VM
Write-Host "Отправляем изменения на VM..." -ForegroundColor Yellow
git push origin main

Write-Host "`n=== Изменения успешно отправлены на VM ===" -ForegroundColor Green
Write-Host "Теперь можно подключаться к VM и продолжать разработку" -ForegroundColor Cyan
