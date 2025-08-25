# PowerShell скрипт для копирования файлов на VM
# Выполнять локально в PowerShell

Write-Host "=== Копирование файлов на VM ===" -ForegroundColor Green

$VM_HOST = "158.160.169.147"
$VM_USER = "dankartsev"
$VM_PATH = "/home/dankartsev/bot-test"

# Создаем архив с необходимыми файлами
Write-Host "Создаем архив..." -ForegroundColor Yellow
if (Test-Path "backend-files.tar.gz") {
    Remove-Item "backend-files.tar.gz" -Force
}

# Используем 7-Zip если доступен, иначе tar
if (Get-Command "7z" -ErrorAction SilentlyContinue) {
    7z a -ttar backend-files.tar.gz . -xr!node_modules -xr!dist -xr!logs -xr!uploads -xr!.git
} else {
    # Fallback для Windows без 7-Zip
    Write-Host "7-Zip не найден, используем встроенный tar..." -ForegroundColor Yellow
    tar -czf backend-files.tar.gz --exclude=node_modules --exclude=dist --exclude=logs --exclude=uploads --exclude=.git .
}

# Копируем архив на VM
Write-Host "Копируем архив на VM..." -ForegroundColor Yellow
scp backend-files.tar.gz ${VM_USER}@${VM_HOST}:~/

# Выполняем команды на VM
Write-Host "Выполняем команды на VM..." -ForegroundColor Yellow
$sshCommands = @"
    # Останавливаем существующие процессы
    pkill -f 'node.*backend' || true
    
    # Создаем директорию если её нет
    mkdir -p ${VM_PATH}
    cd ${VM_PATH}
    
    # Распаковываем архив
    tar -xzf ~/backend-files.tar.gz
    
    # Устанавливаем зависимости
    npm install
    
    # Собираем проект
    npm run build
    
    # Настраиваем базу данных
    npm run setup-db
    
    echo 'Файлы успешно скопированы и настроены на VM'
"@

ssh ${VM_USER}@${VM_HOST} $sshCommands

# Удаляем локальный архив
Remove-Item "backend-files.tar.gz" -Force

Write-Host "=== Копирование завершено ===" -ForegroundColor Green
Write-Host "Теперь на VM можно запустить: npm run start" -ForegroundColor Cyan
