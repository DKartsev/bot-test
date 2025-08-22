# Скрипт для очистки диска и запуска admin панели на VM
Write-Host "Очистка диска и запуск admin панели на VM" -ForegroundColor Green
Write-Host ""

# Пушим последние изменения
Write-Host "Пушим изменения в Git..." -ForegroundColor Yellow
git add .
git commit -m "Добавлен скрипт очистки диска"
git push origin main

Write-Host "Изменения отправлены в Git" -ForegroundColor Green
Write-Host ""

Write-Host "Теперь выполните на VM следующие команды по порядку:" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== ШАГ 1: ОЧИСТКА ДИСКА ===" -ForegroundColor Red
Write-Host "1. Подключитесь к VM:" -ForegroundColor White
Write-Host "   ssh -l dankartsev 84.201.146.125" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Проверьте использование диска:" -ForegroundColor White
Write-Host "   df -h" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Очистите временные файлы:" -ForegroundColor White
Write-Host "   sudo rm -rf /tmp/*" -ForegroundColor Gray
Write-Host "   sudo rm -rf /var/tmp/*" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Очистите логи:" -ForegroundColor White
Write-Host "   sudo journalctl --vacuum-time=1d" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Очистите Docker:" -ForegroundColor White
Write-Host "   docker system prune -af --volumes" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Очистите npm кэш:" -ForegroundColor White
Write-Host "   npm cache clean --force" -ForegroundColor Gray
Write-Host ""

Write-Host "=== ШАГ 2: ЗАПУСК ADMIN ПАНЕЛИ ===" -ForegroundColor Green
Write-Host "7. Перейдите в папку admin панели:" -ForegroundColor White
Write-Host "   cd /mnt/admin-disk/bot-project/packages/operator-admin" -ForegroundColor Gray
Write-Host ""
Write-Host "8. Подтяните изменения:" -ForegroundColor White
Write-Host "   git pull origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "9. Запустите admin панель:" -ForegroundColor White
Write-Host "   PORT=3001 npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "10. Проверьте доступность:" -ForegroundColor White
Write-Host "    curl http://localhost:3001/admin" -ForegroundColor Gray
Write-Host ""

Write-Host "=== РЕЗУЛЬТАТ ===" -ForegroundColor Blue
Write-Host "Admin панель будет доступна по адресу:" -ForegroundColor Green
Write-Host "   http://84.201.146.125:3001/admin" -ForegroundColor Blue
Write-Host ""
Write-Host "После очистки диска SSH команды должны работать корректно!" -ForegroundColor Yellow
