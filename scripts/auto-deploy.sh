#!/bin/bash

# Автоматический скрипт деплоя на VM
# Использование: ./scripts/auto-deploy.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Параметры
VMIP=""
SSH_KEY_PATH=""
VM_USER="dankartsev"
PROJECT_PATH="~/bot-project"
WATCH_MODE=false
FORCE_DEPLOY=false

# Функция для вывода справки
show_help() {
    echo "🚀 Автоматический деплой на VM"
    echo ""
    echo "Использование: $0 [опции]"
    echo ""
    echo "Обязательные параметры:"
    echo "  -i, --ip IP_ADDRESS     IP адрес VM"
    echo "  -k, --key KEY_PATH      Путь к SSH ключу"
    echo ""
    echo "Опциональные параметры:"
    echo "  -u, --user USER         Пользователь VM (по умолчанию: $VM_USER)"
    echo "  -p, --path PATH         Путь к проекту на VM (по умолчанию: $PROJECT_PATH)"
    echo "  -w, --watch             Режим мониторинга изменений"
    echo "  -f, --force             Принудительный деплой"
    echo "  -h, --help              Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 -i 84.201.146.125 -k yandex-vm-key"
    echo "  $0 -i 84.201.146.125 -k yandex-vm-key -w"
    echo ""
}

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--ip)
            VMIP="$2"
            shift 2
            ;;
        -k|--key)
            SSH_KEY_PATH="$2"
            shift 2
            ;;
        -u|--user)
            VM_USER="$2"
            shift 2
            ;;
        -p|--path)
            PROJECT_PATH="$2"
            shift 2
            ;;
        -w|--watch)
            WATCH_MODE=true
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "❌ Неизвестный параметр: $1"
            show_help
            exit 1
            ;;
    esac
done

# Проверка обязательных параметров
if [[ -z "$VMIP" || -z "$SSH_KEY_PATH" ]]; then
    echo "❌ Необходимо указать IP адрес VM и путь к SSH ключу"
    show_help
    exit 1
fi

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}📡 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${WHITE}$1${NC}"
}

# Функция для выполнения команды на VM
execute_on_vm() {
    local command="$1"
    local description="$2"
    
    log_info "$description..."
    log_step "Команда: $command"
    
    if ssh -i "$SSH_KEY_PATH" "${VM_USER}@${VMIP}" "$command"; then
        log_success "$description выполнено успешно"
        return 0
    else
        log_error "$description завершилось с ошибкой"
        return 1
    fi
}

# Функция для копирования файлов на VM
copy_to_vm() {
    local source="$1"
    local destination="$2"
    
    log_info "Копирование $source на VM..."
    
    if scp -i "$SSH_KEY_PATH" "$source" "${VM_USER}@${VMIP}:$destination"; then
        log_success "Файл скопирован успешно"
        return 0
    else
        log_error "Ошибка копирования"
        return 1
    fi
}

# Функция для деплоя
deploy_to_vm() {
    log_info "Начинаем деплой..."
    
    # Шаг 1: Проверка директории dist
    if [[ ! -d "dist" ]]; then
        log_error "Директория dist не найдена. Выполните сборку проекта сначала."
        return 1
    fi
    
    # Шаг 2: Создание архива
    log_info "Создание архива для деплоя..."
    local timestamp=$(date +"%Y%m%d-%H%M%S")
    local archive_name="deploy-${timestamp}.zip"
    
    if zip -r "$archive_name" dist > /dev/null; then
        log_success "Архив создан: $archive_name"
    else
        log_error "Ошибка создания архива"
        return 1
    fi
    
    # Шаг 3: Копирование архива на VM
    if ! copy_to_vm "$archive_name" "$PROJECT_PATH/"; then
        rm -f "$archive_name"
        return 1
    fi
    
    # Шаг 4: Распаковка на VM
    log_info "Распаковка архива на VM..."
    local deploy_script="cd $PROJECT_PATH && rm -rf dist-old && if [ -d 'dist' ]; then mv dist dist-old; fi && unzip -o $archive_name && rm $archive_name"
    
    if ! execute_on_vm "$deploy_script" "Распаковка архива"; then
        rm -f "$archive_name"
        return 1
    fi
    
    # Шаг 5: Установка зависимостей
    log_info "Установка зависимостей..."
    local install_script="cd $PROJECT_PATH/dist && npm ci --production"
    
    if ! execute_on_vm "$install_script" "Установка зависимостей"; then
        log_warning "Установка зависимостей не удалась, продолжаем..."
    fi
    
    # Шаг 6: Перезапуск сервисов
    log_info "Перезапуск сервисов..."
    local restart_script="cd $PROJECT_PATH/dist && pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js && pm2 save"
    
    if ! execute_on_vm "$restart_script" "Перезапуск сервисов"; then
        log_warning "Перезапуск сервисов не удался"
    fi
    
    # Шаг 7: Проверка статуса
    log_info "Проверка статуса сервисов..."
    local status=$(ssh -i "$SSH_KEY_PATH" "${VM_USER}@${VMIP}" "pm2 status" 2>/dev/null || true)
    if [[ -n "$status" ]]; then
        log_info "Статус PM2:"
        echo "$status"
    fi
    
    # Шаг 8: Очистка локального архива
    rm -f "$archive_name"
    log_success "Локальный архив удален"
    
    log_success "Деплой завершен успешно!"
    return 0
}

# Функция для мониторинга изменений
watch_and_deploy() {
    log_info "Режим мониторинга изменений..."
    echo "Нажмите Ctrl+C для остановки"
    echo ""
    
    # Проверяем наличие inotify-tools
    if ! command -v inotifywait &> /dev/null; then
        log_warning "inotifywait не найден. Установите inotify-tools для мониторинга изменений."
        log_info "Установка: sudo apt-get install inotify-tools"
        return 1
    fi
    
    # Мониторинг изменений
    inotifywait -m -r -e modify,create,delete,move . --exclude '\.(tmp|log|zip|tar\.gz)$|node_modules|dist|\.git' | while read -r directory events filename; do
        local timestamp=$(date +"%H:%M:%S")
        echo -e "[$timestamp] ${YELLOW}Изменение: $directory$filename${NC}"
        
        # Ждем немного, чтобы изменения завершились
        sleep 2
        
        # Запускаем деплой
        log_info "Запуск автоматического деплоя..."
        deploy_to_vm
    done
}

# Основная логика
main() {
    echo -e "${GREEN}🚀 Автоматический деплой на VM $VMIP${NC}"
    echo ""
    
    # Проверка SSH ключа
    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        log_error "SSH ключ не найден: $SSH_KEY_PATH"
        exit 1
    fi
    
    # Установка правильных прав для SSH ключа
    chmod 600 "$SSH_KEY_PATH"
    
    # Проверка подключения к VM
    log_info "Проверка подключения к VM..."
    if ! execute_on_vm "echo 'Connection OK'" "Проверка подключения"; then
        log_error "Не удается подключиться к VM. Проверьте IP адрес и SSH ключ."
        exit 1
    fi
    
    log_success "Подключение к VM установлено"
    
    if [[ "$WATCH_MODE" == true ]]; then
        # Режим мониторинга
        watch_and_deploy
    else
        # Одноразовый деплой
        deploy_to_vm
    fi
}

# Обработка сигналов
trap 'echo -e "\n${YELLOW}Получен сигнал прерывания. Завершение работы...${NC}"; exit 0' INT TERM

# Запуск основной функции
main "$@"
