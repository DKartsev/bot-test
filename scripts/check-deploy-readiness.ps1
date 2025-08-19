# PowerShell скрипт проверки готовности проекта к деплою на VM
# Использование: .\scripts\check-deploy-readiness.ps1

param(
    [switch]$Verbose
)

# Цвета для вывода
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

Write-Host "🔍 Проверяем готовность проекта к деплою на VM..." -ForegroundColor $Blue
Write-Host ""

# Счетчики
$TotalChecks = 0
$PassedChecks = 0
$FailedChecks = 0

# Функция для проверки
function Test-Item {
    param(
        [string]$Description,
        [scriptblock]$CheckCommand,
        [string]$SuccessMessage,
        [string]$FailureMessage
    )
    
    $script:TotalChecks++
    
    try {
        $result = & $CheckCommand
        if ($result) {
            Write-Host "✅ $Description" -ForegroundColor $Green
            $script:PassedChecks++
            if ($SuccessMessage) {
                Write-Host "   $SuccessMessage" -ForegroundColor $Blue
            }
        } else {
            Write-Host "❌ $Description" -ForegroundColor $Red
            $script:FailedChecks++
            if ($FailureMessage) {
                Write-Host "   $FailureMessage" -ForegroundColor $Yellow
            }
        }
    } catch {
        Write-Host "❌ $Description" -ForegroundColor $Red
        $script:FailedChecks++
        if ($FailureMessage) {
            Write-Host "   $FailureMessage" -ForegroundColor $Yellow
        }
    }
    Write-Host ""
}

# Проверка структуры проекта
Write-Host "📁 Проверка структуры проекта:" -ForegroundColor $Blue

Test-Item \
    "Корневой package.json" \
    { Test-Path "package.json" } \
    "Основной файл зависимостей найден" \
    "Создайте package.json в корне проекта"

Test-Item \
    "Backend директория" \
    { Test-Path "packages\backend" } \
    "Backend код найден" \
    "Создайте директорию packages\backend"

Test-Item \
    "Admin директория" \
    { Test-Path "packages\operator-admin" } \
    "Admin панель найдена" \
    "Создайте директорию packages\operator-admin"

Test-Item \
    "Shared директория" \
    { Test-Path "packages\shared" } \
    "Общие типы найдены" \
    "Создайте директорию packages\shared"

# Проверка конфигурационных файлов
Write-Host "⚙️ Проверка конфигурационных файлов:" -ForegroundColor $Blue

Test-Item \
    "PM2 конфигурация" \
    { Test-Path "ecosystem.config.js" } \
    "PM2 конфигурация готова" \
    "Создайте ecosystem.config.js"

Test-Item \
    "Docker Compose" \
    { Test-Path "docker-compose.yml" } \
    "Docker конфигурация готова" \
    "Создайте docker-compose.yml"

Test-Item \
    "TypeScript конфигурация" \
    { Test-Path "tsconfig.json" } \
    "TypeScript настроен" \
    "Создайте tsconfig.json"

Test-Item \
    "Переменные окружения" \
    { Test-Path "env-template.txt" } \
    "Шаблон переменных окружения готов" \
    "Создайте env-template.txt"

# Проверка скриптов
Write-Host "📜 Проверка скриптов:" -ForegroundColor $Blue

Test-Item \
    "Скрипт деплоя (Linux)" \
    { Test-Path "scripts\deploy-vm.sh" } \
    "Скрипт деплоя для Linux готов" \
    "Создайте scripts\deploy-vm.sh"

Test-Item \
    "Скрипт деплоя (Windows)" \
    { Test-Path "scripts\deploy-vm.ps1" } \
    "Скрипт деплоя для Windows готов" \
    "Создайте scripts\deploy-vm.ps1"

Test-Item \
    "Скрипт очистки (Linux)" \
    { Test-Path "scripts\clean-project.sh" } \
    "Скрипт очистки для Linux готов" \
    "Создайте scripts\clean-project.sh"

Test-Item \
    "Скрипт очистки (Windows)" \
    { Test-Path "scripts\clean-project.ps1" } \
    "Скрипт очистки для Windows готов" \
    "Создайте scripts\clean-project.ps1"

# Проверка Nginx конфигурации
Write-Host "🌐 Проверка Nginx конфигурации:" -ForegroundColor $Blue

Test-Item \
    "Nginx директория" \
    { Test-Path "nginx" } \
    "Nginx конфигурация найдена" \
    "Создайте директорию nginx"

Test-Item \
    "Nginx конфигурация" \
    { Test-Path "nginx\nginx.conf" } \
    "Nginx конфигурация готова" \
    "Создайте nginx\nginx.conf"

# Проверка Docker файлов
Write-Host "🐳 Проверка Docker файлов:" -ForegroundColor $Blue

Test-Item \
    "Dockerfile для backend" \
    { Test-Path "Dockerfile.backend" } \
    "Dockerfile для backend готов" \
    "Создайте Dockerfile.backend"

Test-Item \
    "Dockerfile для admin" \
    { Test-Path "packages\operator-admin\Dockerfile.admin" } \
    "Dockerfile для admin готов" \
    "Создайте packages\operator-admin\Dockerfile.admin"

# Проверка зависимостей
Write-Host "📦 Проверка зависимостей:" -ForegroundColor $Blue

Test-Item \
    "Корневые зависимости" \
    { (Get-Content "package.json" | Select-String "pm2") -ne $null } \
    "PM2 добавлен в зависимости" \
    "Добавьте pm2 в package.json"

Test-Item \
    "Backend зависимости" \
    { (Get-Content "packages\backend\package.json" | Select-String "fastify") -ne $null } \
    "Fastify найден в backend зависимостях" \
    "Добавьте fastify в packages\backend\package.json"

Test-Item \
    "Admin зависимости" \
    { (Get-Content "packages\operator-admin\package.json" | Select-String "next") -ne $null } \
    "Next.js найден в admin зависимостях" \
    "Добавьте next в packages\operator-admin\package.json"

# Проверка исходного кода
Write-Host "💻 Проверка исходного кода:" -ForegroundColor $Blue

Test-Item \
    "Backend main.ts" \
    { Test-Path "packages\backend\src\main.ts" } \
    "Backend точка входа найдена" \
    "Создайте packages\backend\src\main.ts"

Test-Item \
    "Admin страница" \
    { Test-Path "packages\operator-admin\src\app\page.tsx" } \
    "Admin главная страница найдена" \
    "Создайте packages\operator-admin\src\app\page.tsx"

# Проверка документации
Write-Host "📚 Проверка документации:" -ForegroundColor $Blue

Test-Item \
    "README для деплоя" \
    { Test-Path "README-VM-DEPLOY.md" } \
    "Документация по деплою готова" \
    "Создайте README-VM-DEPLOY.md"

Test-Item \
    "Основной README" \
    { Test-Path "README.md" } \
    "Основной README готов" \
    "Создайте README.md"

# Итоговая статистика
Write-Host "📊 Итоговая статистика:" -ForegroundColor $Blue
Write-Host "✅ Пройдено: $PassedChecks" -ForegroundColor $Green
Write-Host "❌ Провалено: $FailedChecks" -ForegroundColor $Red
Write-Host "📋 Всего проверок: $TotalChecks" -ForegroundColor $Blue

# Рекомендации
Write-Host ""
if ($FailedChecks -eq 0) {
    Write-Host "🎉 Проект полностью готов к деплою на VM!" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Следующие шаги:" -ForegroundColor $Blue
    Write-Host "1. Настройте переменные окружения: Copy-Item env-template.txt .env" -ForegroundColor $White
    Write-Host "2. Установите зависимости: npm install" -ForegroundColor $White
    Write-Host "3. Соберите проект: npm run build" -ForegroundColor $White
    Write-Host "4. Запустите деплой: .\scripts\deploy-vm.ps1 -VMIP <VM_IP> -SSHKeyPath <SSH_KEY_PATH>" -ForegroundColor $White
} else {
    Write-Host "⚠️ Проект требует доработки перед деплоем" -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "Рекомендации:" -ForegroundColor $Blue
    Write-Host "1. Исправьте все проваленные проверки" -ForegroundColor $White
    Write-Host "2. Запустите скрипт очистки: .\scripts\clean-project.ps1" -ForegroundColor $White
    Write-Host "3. Повторите проверку: .\scripts\check-deploy-readiness.ps1" -ForegroundColor $White
    Write-Host "4. После исправления всех проблем запустите деплой" -ForegroundColor $White
}

Write-Host ""
Write-Host "Для получения подробной информации смотрите README-VM-DEPLOY.md" -ForegroundColor $Blue

# Возвращаем код ошибки если есть проблемы
if ($FailedChecks -gt 0) {
    exit 1
}
