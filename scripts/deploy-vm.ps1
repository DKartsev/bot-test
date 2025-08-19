# PowerShell скрипт деплоя на VM Яндекс.Облака
# Использование: .\scripts\deploy-vm.ps1 -VMIP <VM_IP> -SSHKeyPath <SSH_KEY_PATH>

param(
    [Parameter(Mandatory=$true)]
    [string]$VMIP,
    
    [Parameter(Mandatory=$true)]
    [string]$SSHKeyPath
)

# Проверка наличия SSH ключа
if (-not (Test-Path $SSHKeyPath)) {
    Write-Host "Ошибка: SSH ключ не найден: $SSHKeyPath" -ForegroundColor Red
    exit 1
}

$RemoteUser = "ubuntu"
$RemoteDir = "/opt/bot-support-system"

Write-Host "🚀 Начинаем деплой на VM $VMIP" -ForegroundColor Green

# Проверка подключения к VM
Write-Host "Проверяем подключение к VM..." -ForegroundColor Yellow
try {
    $testConnection = ssh -i $SSHKeyPath -o ConnectTimeout=10 -o StrictHostKeyChecking=no "${RemoteUser}@${VMIP}" "echo 'Подключение успешно'" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Не удается подключиться к VM"
    }
} catch {
    Write-Host "Ошибка: Не удается подключиться к VM" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Подключение к VM установлено" -ForegroundColor Green

# Сборка проекта
Write-Host "Собираем проект..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при сборке проекта" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Проект собран" -ForegroundColor Green

# Создание архива для деплоя
Write-Host "Создаем архив для деплоя..." -ForegroundColor Yellow
$DeployArchive = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"

# Создаем временную директорию для деплоя
$TempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
Copy-Item -Recurse dist $TempDir
Copy-Item -Recurse packages/operator-admin/.next $TempDir/admin-next
Copy-Item -Recurse packages/operator-admin/public $TempDir/admin-public
Copy-Item packages/operator-admin/next.config.js $TempDir
Copy-Item packages/operator-admin/package.json $TempDir/admin-package.json
Copy-Item package.json $TempDir
Copy-Item ecosystem.config.js $TempDir
Copy-Item docker-compose.yml $TempDir
Copy-Item -Recurse nginx $TempDir
Copy-Item env-template.txt $TempDir/.env.example

# Создаем архив (требуется 7-Zip или tar)
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf $DeployArchive -C $TempDir .
} elseif (Get-Command 7z -ErrorAction SilentlyContinue) {
    7z a -ttar $DeployArchive "$TempDir\*"
    7z a -tgzip "$DeployArchive.gz" $DeployArchive
    Remove-Item $DeployArchive
    $DeployArchive = "$DeployArchive.gz"
} else {
    Write-Host "Ошибка: Не найден tar или 7-Zip для создания архива" -ForegroundColor Red
    exit 1
}

Remove-Item -Recurse -Force $TempDir

Write-Host "✅ Архив создан: $DeployArchive" -ForegroundColor Green

# Копирование архива на VM
Write-Host "Копируем архив на VM..." -ForegroundColor Yellow
scp -i $SSHKeyPath -o StrictHostKeyChecking=no $DeployArchive "${RemoteUser}@${VMIP}:/tmp/"

# Выполнение команд на VM
Write-Host "Выполняем деплой на VM..." -ForegroundColor Yellow
$deployScript = @"
set -e

# Создание директории приложения
sudo mkdir -p /opt/bot-support-system
sudo chown \$USER:\$USER /opt/bot-support-system

# Переход в директорию
cd /opt/bot-support-system

# Распаковка архива
tar -xzf "/tmp/$(Split-Path $DeployArchive -Leaf)"

# Установка зависимостей
npm ci --only=production

# Установка зависимостей для admin
cd admin-next
npm ci --only=production
cd ..

# Создание директорий для логов
mkdir -p logs data uploads

# Настройка прав доступа
sudo chown -R \$USER:\$USER /opt/bot-support-system

# Создание systemd сервиса для PM2
sudo tee /etc/systemd/system/bot-support.service > /dev/null << 'SERVICE_EOF'
[Unit]
Description=Bot Support System
After=network.target

[Service]
Type=forking
User=ubuntu
WorkingDirectory=/opt/bot-support-system
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Перезагрузка systemd и включение сервиса
sudo systemctl daemon-reload
sudo systemctl enable bot-support.service

# Установка и настройка PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Запуск приложения
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Деплой завершен успешно!"
"@

$deployScript | ssh -i $SSHKeyPath -o StrictHostKeyChecking=no "${RemoteUser}@${VMIP}"

# Очистка локального архива
Remove-Item $DeployArchive

Write-Host "🎉 Деплой завершен успешно!" -ForegroundColor Green
Write-Host "Приложение доступно по адресу: http://$VMIP" -ForegroundColor Yellow
Write-Host "Admin панель: http://${VMIP}:3001" -ForegroundColor Yellow
Write-Host "API: http://${VMIP}:3000/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "Полезные команды:" -ForegroundColor Green
Write-Host "  SSH подключение: ssh -i $SSHKeyPath $RemoteUser@$VMIP" -ForegroundColor White
Write-Host "  Просмотр логов: ssh -i $SSHKeyPath $RemoteUser@$VMIP 'pm2 logs'" -ForegroundColor White
Write-Host "  Перезапуск: ssh -i $SSHKeyPath $RemoteUser@$VMIP 'pm2 restart all'" -ForegroundColor White
Write-Host "  Статус: ssh -i $SSHKeyPath $RemoteUser@$VMIP 'pm2 status'" -ForegroundColor White
