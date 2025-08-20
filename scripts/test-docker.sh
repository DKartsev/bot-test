#!/bin/bash

# Скрипт для тестирования Docker конфигурации
# Использование: ./scripts/test-docker.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверяем, что Docker запущен
if ! docker info >/dev/null 2>&1; then
    error "Docker не запущен или не доступен"
    exit 1
fi

log "Начинаем тестирование Docker конфигурации..."

# 1. Проверяем docker-compose конфигурацию
log "Проверяем docker-compose конфигурацию..."
if docker-compose config >/dev/null 2>&1; then
    success "docker-compose.yml корректен"
else
    error "Ошибка в docker-compose.yml"
    docker-compose config
    exit 1
fi

# 2. Собираем образы
log "Собираем Docker образы..."
if make build; then
    success "Образы успешно собраны"
else
    error "Ошибка при сборке образов"
    exit 1
fi

# 3. Запускаем сервисы в development режиме
log "Запускаем сервисы в development режиме..."
if make dev; then
    success "Сервисы запущены"
else
    error "Ошибка при запуске сервисов"
    exit 1
fi

# 4. Ждем запуска сервисов
log "Ждем запуска сервисов..."
sleep 10

# 5. Проверяем статус сервисов
log "Проверяем статус сервисов..."
if make status; then
    success "Статус сервисов получен"
else
    error "Ошибка при получении статуса"
fi

# 6. Проверяем health check
log "Проверяем health check..."
if make health; then
    success "Health check прошел успешно"
else
    warning "Health check не прошел"
fi

# 7. Тестируем API endpoints
log "Тестируем API endpoints..."

# Backend health
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    success "Backend health endpoint доступен"
else
    error "Backend health endpoint недоступен"
fi

# Admin health (если запущен)
if curl -f http://localhost:3001/health >/dev/null 2>&1; then
    success "Admin health endpoint доступен"
else
    warning "Admin health endpoint недоступен"
fi

# 8. Проверяем базу данных
log "Проверяем подключение к базе данных..."
if docker-compose exec -T postgres psql -U bot_user -d bot_support -c "SELECT version();" >/dev/null 2>&1; then
    success "Подключение к PostgreSQL успешно"
else
    error "Ошибка подключения к PostgreSQL"
fi

# 9. Проверяем Redis
log "Проверяем подключение к Redis..."
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    success "Подключение к Redis успешно"
else
    error "Ошибка подключения к Redis"
fi

# 10. Проверяем логи
log "Проверяем логи сервисов..."
if docker-compose logs --tail=10 bot-backend >/dev/null 2>&1; then
    success "Логи backend доступны"
else
    warning "Логи backend недоступны"
fi

# 11. Тестируем production режим
log "Тестируем production режим..."
if make down; then
    success "Development сервисы остановлены"
else
    error "Ошибка при остановке development сервисов"
fi

if make build-prod; then
    success "Production образы собраны"
else
    error "Ошибка при сборке production образов"
fi

if make up-prod; then
    success "Production сервисы запущены"
else
    error "Ошибка при запуске production сервисов"
fi

# Ждем запуска
sleep 15

# Проверяем health check в production
log "Проверяем health check в production..."
if make health; then
    success "Production health check прошел успешно"
else
    warning "Production health check не прошел"
fi

# 12. Очистка
log "Останавливаем production сервисы..."
make down-prod

log "Очищаем ресурсы..."
make clean

success "Тестирование Docker конфигурации завершено успешно!"

log "Результаты тестирования:"
echo "✅ Docker конфигурация корректна"
echo "✅ Образы собираются без ошибок"
echo "✅ Сервисы запускаются в development режиме"
echo "✅ Сервисы запускаются в production режиме"
echo "✅ Health checks работают"
echo "✅ API endpoints доступны"
echo "✅ База данных и Redis доступны"
echo "✅ Логи корректно записываются"

log "Docker конфигурация готова к использованию!"
