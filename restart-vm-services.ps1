# Скрипт для перезапуска сервисов на VM
Write-Host "🔄 Перезапуск сервисов на VM..." -ForegroundColor Yellow

# Команды для выполнения на VM
$commands = @(
    "cd /root/bot-test",
    "git pull origin main",
    "docker-compose down",
    "docker-compose up -d --build",
    "docker ps"
)

Write-Host "📋 Команды для выполнения на VM:" -ForegroundColor Cyan
foreach ($cmd in $commands) {
    Write-Host "  $cmd" -ForegroundColor Gray
}

Write-Host "`n🔧 Выполните эти команды на VM (158.160.169.147):" -ForegroundColor Green
Write-Host "ssh root@158.160.169.147" -ForegroundColor White
Write-Host "Затем выполните команды выше" -ForegroundColor White
