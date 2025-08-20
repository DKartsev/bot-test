# PowerShell скрипт для синхронизации Docker конфигурации с VM
# Использование: .\scripts\docker-sync.ps1 [commit_message]

param(
    [string]$CommitMessage = ""
)

# Функция для логирования
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        default { "Blue" }
    }
    
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

# Проверяем, что мы в git репозитории
if (-not (Test-Path ".git")) {
    Write-Log "Этот скрипт должен быть запущен из git репозитория" "ERROR"
    exit 1
}

# Проверяем статус git
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Log "Обнаружены несохраненные изменения"
    
    # Показываем статус
    git status --short
    
    # Запрашиваем подтверждение
    $response = Read-Host "Продолжить с коммитом изменений? (y/N)"
    if ($response -notmatch "^[Yy]$") {
        Write-Log "Синхронизация отменена"
        exit 0
    }
}

# Получаем сообщение коммита
if (-not $CommitMessage) {
    $CommitMessage = "Auto-sync: Docker configuration update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

Write-Log "Начинаем синхронизацию с VM..."

# Добавляем все изменения
Write-Log "Добавляем изменения в git..."
git add .

# Проверяем, есть ли что коммитить
$gitStatus = git status --porcelain
if (-not $gitStatus) {
    Write-Log "Нет изменений для коммита" "WARNING"
} else {
    # Создаем коммит
    Write-Log "Создаем коммит: $CommitMessage"
    git commit -m $CommitMessage
}

# Получаем текущую ветку
$currentBranch = git branch --show-current
Write-Log "Текущая ветка: $currentBranch"

# Отправляем изменения
Write-Log "Отправляем изменения на удаленный репозиторий..."
try {
    git push origin $currentBranch
    Write-Log "Код успешно синхронизирован с VM" "SUCCESS"
} catch {
    Write-Log "Ошибка при отправке изменений" "ERROR"
    exit 1
}

# Проверяем, есть ли remote для VM
try {
    $vmRemote = git remote get-url vm 2>$null
    if ($vmRemote) {
        Write-Log "Отправляем изменения на VM..."
        try {
            git push vm $currentBranch
            Write-Log "Код успешно отправлен на VM" "SUCCESS"
        } catch {
            Write-Log "Не удалось отправить на VM (возможно, VM недоступна)" "WARNING"
        }
    } else {
        Write-Log "Remote для VM не настроен, пропускаем прямую отправку"
    }
} catch {
    Write-Log "Remote для VM не настроен, пропускаем прямую отправку"
}

# Показываем статус
Write-Log "Текущий статус:"
git status --short

Write-Log "Синхронизация завершена успешно!" "SUCCESS"

# Дополнительные команды для Docker
Write-Log "Для применения изменений на VM выполните:"
Write-Host "  ssh -l dankartsev 84.201.146.125"
Write-Host "  cd /path/to/project"
Write-Host "  git pull origin $currentBranch"
Write-Host "  make build"
Write-Host "  make up-prod"
