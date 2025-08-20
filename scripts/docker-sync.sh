#!/bin/bash

# Скрипт для синхронизации Docker конфигурации с VM
# Использование: ./scripts/docker-sync.sh [commit_message]

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

# Проверяем, что мы в git репозитории
if [ ! -d ".git" ]; then
    error "Этот скрипт должен быть запущен из git репозитория"
    exit 1
fi

# Проверяем статус git
if [ -n "$(git status --porcelain)" ]; then
    log "Обнаружены несохраненные изменения"
    
    # Показываем статус
    git status --short
    
    # Запрашиваем подтверждение
    read -p "Продолжить с коммитом изменений? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Синхронизация отменена"
        exit 0
    fi
fi

# Получаем сообщение коммита
COMMIT_MESSAGE=${1:-"Auto-sync: Docker configuration update $(date +'%Y-%m-%d %H:%M:%S')"}

log "Начинаем синхронизацию с VM..."

# Добавляем все изменения
log "Добавляем изменения в git..."
git add .

# Проверяем, есть ли что коммитить
if [ -z "$(git status --porcelain)" ]; then
    warning "Нет изменений для коммита"
else
    # Создаем коммит
    log "Создаем коммит: $COMMIT_MESSAGE"
    git commit -m "$COMMIT_MESSAGE"
fi

# Получаем текущую ветку
CURRENT_BRANCH=$(git branch --show-current)
log "Текущая ветка: $CURRENT_BRANCH"

# Отправляем изменения
log "Отправляем изменения на удаленный репозиторий..."
if git push origin "$CURRENT_BRANCH"; then
    success "Код успешно синхронизирован с VM"
else
    error "Ошибка при отправке изменений"
    exit 1
fi

# Проверяем, есть ли remote для VM
if git remote get-url vm >/dev/null 2>&1; then
    log "Отправляем изменения на VM..."
    if git push vm "$CURRENT_BRANCH"; then
        success "Код успешно отправлен на VM"
    else
        warning "Не удалось отправить на VM (возможно, VM недоступна)"
    fi
else
    log "Remote для VM не настроен, пропускаем прямую отправку"
fi

# Показываем статус
log "Текущий статус:"
git status --short

success "Синхронизация завершена успешно!"

# Дополнительные команды для Docker
log "Для применения изменений на VM выполните:"
echo "  ssh -l dankartsev 84.201.146.125"
echo "  cd /path/to/project"
echo "  git pull origin $CURRENT_BRANCH"
echo "  make build"
echo "  make up-prod"
