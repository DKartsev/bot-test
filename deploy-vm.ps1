# PowerShell скрипт для быстрого деплоя на VM
# Использование: .\deploy-vm.ps1 [dev|prod]

param(
    [string]$Mode = "dev"
)

$VM_HOST = "dankartsev@158.160.197.7"
$VM_PATH = "/home/dankartsev/bot-test"

Write-Host "🚀 Деплой в режиме: $Mode" -ForegroundColor Green

# Синхронизируем код с VM
Write-Host "📦 Синхронизация кода с VM..." -ForegroundColor Yellow
ssh $VM_HOST "cd $VM_PATH && git pull"

# Выполняем команды на VM
Write-Host "🔄 Перезапуск сервисов на VM..." -ForegroundColor Yellow
ssh $VM_HOST "cd $VM_PATH && docker-compose down && docker-compose up -d"

# Тестируем
Write-Host "🧪 Тестирование..." -ForegroundColor Yellow
node restart-vm.cjs

Write-Host "✅ Деплой завершен" -ForegroundColor Green
