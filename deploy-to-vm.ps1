# Скрипт для развертывания на VM
$VM_HOST = "158.160.169.147"
$VM_USER = "root"
$PROJECT_DIR = "/root/bot-test"

Write-Host "🚀 Начинаем развертывание на VM $VM_HOST..." -ForegroundColor Green

# Функция для выполнения команд на VM
function Invoke-VMCommand {
    param($Command)
    ssh "$VM_USER@$VM_HOST" "cd $PROJECT_DIR && $Command"
}

try {
    # 1. Получаем последние изменения
    Write-Host "📥 Получаем последние изменения из Git..." -ForegroundColor Yellow
    Invoke-VMCommand "git pull origin main"

    # 2. Создаем docker.env если его нет
    Write-Host "📄 Проверяем docker.env..." -ForegroundColor Yellow
    Invoke-VMCommand "if [ ! -f docker.env ]; then cp docker.env.example docker.env; echo 'docker.env создан из шаблона'; else echo 'docker.env уже существует'; fi"

    # 3. Останавливаем контейнеры
    Write-Host "🛑 Останавливаем контейнеры..." -ForegroundColor Yellow
    Invoke-VMCommand "docker-compose down"

    # 4. Пересобираем и запускаем контейнеры
    Write-Host "🔨 Пересобираем и запускаем контейнеры..." -ForegroundColor Yellow
    Invoke-VMCommand "docker-compose up --build -d"

    # 5. Ждем запуска
    Write-Host "⏳ Ждем запуска сервисов..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # 6. Проверяем статус контейнеров
    Write-Host "📊 Проверяем статус контейнеров..." -ForegroundColor Yellow
    Invoke-VMCommand "docker-compose ps"

    # 7. Тестируем API
    Write-Host "🧪 Тестируем RAG API..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://$VM_HOST:3000/api/supabase-rag/health" -Method Get -TimeoutSec 5
        Write-Host "✅ Health check успешен" -ForegroundColor Green
        Write-Host $response
    } catch {
        Write-Host "❌ Health check не удался: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "🎉 Развертывание завершено!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Полезные команды для проверки:" -ForegroundColor Cyan
    Write-Host "ssh $VM_USER@$VM_HOST 'cd $PROJECT_DIR && docker-compose logs -f bot-backend'" -ForegroundColor Gray
    Write-Host "ssh $VM_USER@$VM_HOST 'cd $PROJECT_DIR && docker-compose logs -f bot-admin'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 Проверьте сервисы:" -ForegroundColor Cyan
    Write-Host "Backend: http://$VM_HOST:3000" -ForegroundColor Gray
    Write-Host "Admin: http://$VM_HOST:3001" -ForegroundColor Gray
    Write-Host "RAG Health: http://$VM_HOST:3000/api/supabase-rag/health" -ForegroundColor Gray

} catch {
    Write-Host "❌ Ошибка развертывания: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
