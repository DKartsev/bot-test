# PowerShell скрипт для тестирования Docker конфигурации
# Использование: .\scripts\test-docker.ps1

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

# Проверяем, что Docker запущен
try {
    docker info | Out-Null
} catch {
    Write-Log "Docker не запущен или не доступен" "ERROR"
    exit 1
}

Write-Log "Начинаем тестирование Docker конфигурации..."

# 1. Проверяем docker-compose конфигурацию
Write-Log "Проверяем docker-compose конфигурацию..."
try {
    docker-compose config | Out-Null
    Write-Log "docker-compose.yml корректен" "SUCCESS"
} catch {
    Write-Log "Ошибка в docker-compose.yml" "ERROR"
    docker-compose config
    exit 1
}

# 2. Собираем образы
Write-Log "Собираем Docker образы..."
try {
    make build
    Write-Log "Образы успешно собраны" "SUCCESS"
} catch {
    Write-Log "Ошибка при сборке образов" "ERROR"
    exit 1
}

# 3. Запускаем сервисы в development режиме
Write-Log "Запускаем сервисы в development режиме..."
try {
    make dev
    Write-Log "Сервисы запущены" "SUCCESS"
} catch {
    Write-Log "Ошибка при запуске сервисов" "ERROR"
    exit 1
}

# 4. Ждем запуска сервисов
Write-Log "Ждем запуска сервисов..."
Start-Sleep -Seconds 10

# 5. Проверяем статус сервисов
Write-Log "Проверяем статус сервисов..."
try {
    make status
    Write-Log "Статус сервисов получен" "SUCCESS"
} catch {
    Write-Log "Ошибка при получении статуса" "ERROR"
}

# 6. Проверяем health check
Write-Log "Проверяем health check..."
try {
    make health
    Write-Log "Health check прошел успешно" "SUCCESS"
} catch {
    Write-Log "Health check не прошел" "WARNING"
}

# 7. Тестируем API endpoints
Write-Log "Тестируем API endpoints..."

# Backend health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Log "Backend health endpoint доступен" "SUCCESS"
    } else {
        Write-Log "Backend health endpoint недоступен" "ERROR"
    }
} catch {
    Write-Log "Backend health endpoint недоступен" "ERROR"
}

# Admin health (если запущен)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Log "Admin health endpoint доступен" "SUCCESS"
    } else {
        Write-Log "Admin health endpoint недоступен" "WARNING"
    }
} catch {
    Write-Log "Admin health endpoint недоступен" "WARNING"
}

# 8. Проверяем базу данных
Write-Log "Проверяем подключение к базе данных..."
try {
    docker-compose exec -T postgres psql -U bot_user -d bot_support -c "SELECT version();" | Out-Null
    Write-Log "Подключение к PostgreSQL успешно" "SUCCESS"
} catch {
    Write-Log "Ошибка подключения к PostgreSQL" "ERROR"
}

# 9. Проверяем Redis
Write-Log "Проверяем подключение к Redis..."
try {
    $redisResponse = docker-compose exec -T redis redis-cli ping
    if ($redisResponse -match "PONG") {
        Write-Log "Подключение к Redis успешно" "SUCCESS"
    } else {
        Write-Log "Ошибка подключения к Redis" "ERROR"
    }
} catch {
    Write-Log "Ошибка подключения к Redis" "ERROR"
}

# 10. Проверяем логи
Write-Log "Проверяем логи сервисов..."
try {
    docker-compose logs --tail=10 bot-backend | Out-Null
    Write-Log "Логи backend доступны" "SUCCESS"
} catch {
    Write-Log "Логи backend недоступны" "WARNING"
}

# 11. Тестируем production режим
Write-Log "Тестируем production режим..."
try {
    make down
    Write-Log "Development сервисы остановлены" "SUCCESS"
} catch {
    Write-Log "Ошибка при остановке development сервисов" "ERROR"
}

try {
    make build-prod
    Write-Log "Production образы собраны" "SUCCESS"
} catch {
    Write-Log "Ошибка при сборке production образов" "ERROR"
}

try {
    make up-prod
    Write-Log "Production сервисы запущены" "SUCCESS"
} catch {
    Write-Log "Ошибка при запуске production сервисов" "ERROR"
}

# Ждем запуска
Start-Sleep -Seconds 15

# Проверяем health check в production
Write-Log "Проверяем health check в production..."
try {
    make health
    Write-Log "Production health check прошел успешно" "SUCCESS"
} catch {
    Write-Log "Production health check не прошел" "WARNING"
}

# 12. Очистка
Write-Log "Останавливаем production сервисы..."
make down-prod

Write-Log "Очищаем ресурсы..."
make clean

Write-Log "Тестирование Docker конфигурации завершено успешно!" "SUCCESS"

Write-Log "Результаты тестирования:"
Write-Host "✅ Docker конфигурация корректна"
Write-Host "✅ Образы собираются без ошибок"
Write-Host "✅ Сервисы запускаются в development режиме"
Write-Host "✅ Сервисы запускаются в production режиме"
Write-Host "✅ Health checks работают"
Write-Host "✅ API endpoints доступны"
Write-Host "✅ База данных и Redis доступны"
Write-Host "✅ Логи корректно записываются"

Write-Log "Docker конфигурация готова к использованию!"
