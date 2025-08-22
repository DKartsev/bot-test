# Скрипт для синхронизации с VM и запуска admin панели
Write-Host "Синхронизируем изменения с VM..." -ForegroundColor Green

# Пушим изменения
Write-Host "Пушим изменения в Git..." -ForegroundColor Yellow
git add .
git commit -m "Обновления admin панели"
git push origin main

Write-Host "Изменения отправлены в Git" -ForegroundColor Green
Write-Host ""
Write-Host "Теперь выполните на VM следующие команды:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Подключитесь к VM:" -ForegroundColor White
Write-Host "   ssh -l dankartsev 84.201.146.125" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Перейдите в папку admin панели:" -ForegroundColor White
Write-Host "   cd /mnt/admin-disk/bot-project/packages/operator-admin" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Подтяните изменения:" -ForegroundColor White
Write-Host "   git pull origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Запустите admin панель:" -ForegroundColor White
Write-Host "   PORT=3001 npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Проверьте доступность:" -ForegroundColor White
Write-Host "   curl http://localhost:3001/admin" -ForegroundColor Gray
Write-Host ""
Write-Host "Admin панель будет доступна по адресу:" -ForegroundColor Green
Write-Host "   http://84.201.146.125:3001/admin" -ForegroundColor Blue
