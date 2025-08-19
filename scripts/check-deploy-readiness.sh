#!/bin/bash

# Скрипт проверки готовности проекта к деплою на VM
# Использование: ./scripts/check-deploy-readiness.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Проверяем готовность проекта к деплою на VM...${NC}"
echo ""

# Счетчики
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Функция для проверки
function check_item() {
    local description="$1"
    local check_command="$2"
    local success_message="$3"
    local failure_message="$4"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$check_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $description${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        if [ -n "$success_message" ]; then
            echo -e "   ${BLUE}$success_message${NC}"
        fi
    else
        echo -e "${RED}❌ $description${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        if [ -n "$failure_message" ]; then
            echo -e "   ${YELLOW}$failure_message${NC}"
        fi
    fi
    echo ""
}

# Проверка структуры проекта
echo -e "${BLUE}📁 Проверка структуры проекта:${NC}"

check_item \
    "Корневой package.json" \
    "test -f package.json" \
    "Основной файл зависимостей найден" \
    "Создайте package.json в корне проекта"

check_item \
    "Backend директория" \
    "test -d packages/backend" \
    "Backend код найден" \
    "Создайте директорию packages/backend"

check_item \
    "Admin директория" \
    "test -d packages/operator-admin" \
    "Admin панель найдена" \
    "Создайте директорию packages/operator-admin"

check_item \
    "Shared директория" \
    "test -d packages/shared" \
    "Общие типы найдены" \
    "Создайте директорию packages/shared"

# Проверка конфигурационных файлов
echo -e "${BLUE}⚙️ Проверка конфигурационных файлов:${NC}"

check_item \
    "PM2 конфигурация" \
    "test -f ecosystem.config.js" \
    "PM2 конфигурация готова" \
    "Создайте ecosystem.config.js"

check_item \
    "Docker Compose" \
    "test -f docker-compose.yml" \
    "Docker конфигурация готова" \
    "Создайте docker-compose.yml"

check_item \
    "TypeScript конфигурация" \
    "test -f tsconfig.json" \
    "TypeScript настроен" \
    "Создайте tsconfig.json"

check_item \
    "Переменные окружения" \
    "test -f env-template.txt" \
    "Шаблон переменных окружения готов" \
    "Создайте env-template.txt"

# Проверка скриптов
echo -e "${BLUE}📜 Проверка скриптов:${NC}"

check_item \
    "Скрипт деплоя (Linux)" \
    "test -f scripts/deploy-vm.sh" \
    "Скрипт деплоя для Linux готов" \
    "Создайте scripts/deploy-vm.sh"

check_item \
    "Скрипт деплоя (Windows)" \
    "test -f scripts/deploy-vm.ps1" \
    "Скрипт деплоя для Windows готов" \
    "Создайте scripts/deploy-vm.ps1"

check_item \
    "Скрипт очистки (Linux)" \
    "test -f scripts/clean-project.sh" \
    "Скрипт очистки для Linux готов" \
    "Создайте scripts/clean-project.sh"

check_item \
    "Скрипт очистки (Windows)" \
    "test -f scripts/clean-project.ps1" \
    "Скрипт очистки для Windows готов" \
    "Создайте scripts/clean-project.ps1"

# Проверка Nginx конфигурации
echo -e "${BLUE}🌐 Проверка Nginx конфигурации:${NC}"

check_item \
    "Nginx директория" \
    "test -d nginx" \
    "Nginx конфигурация найдена" \
    "Создайте директорию nginx"

check_item \
    "Nginx конфигурация" \
    "test -f nginx/nginx.conf" \
    "Nginx конфигурация готова" \
    "Создайте nginx/nginx.conf"

# Проверка Docker файлов
echo -e "${BLUE}🐳 Проверка Docker файлов:${NC}"

check_item \
    "Dockerfile для backend" \
    "test -f Dockerfile.backend" \
    "Dockerfile для backend готов" \
    "Создайте Dockerfile.backend"

check_item \
    "Dockerfile для admin" \
    "test -f packages/operator-admin/Dockerfile.admin" \
    "Dockerfile для admin готов" \
    "Создайте packages/operator-admin/Dockerfile.admin"

# Проверка зависимостей
echo -e "${BLUE}📦 Проверка зависимостей:${NC}"

check_item \
    "Корневые зависимости" \
    "grep -q 'pm2' package.json" \
    "PM2 добавлен в зависимости" \
    "Добавьте pm2 в package.json"

check_item \
    "Backend зависимости" \
    "grep -q 'fastify' packages/backend/package.json" \
    "Fastify найден в backend зависимостях" \
    "Добавьте fastify в packages/backend/package.json"

check_item \
    "Admin зависимости" \
    "grep -q 'next' packages/operator-admin/package.json" \
    "Next.js найден в admin зависимостях" \
    "Добавьте next в packages/operator-admin/package.json"

# Проверка исходного кода
echo -e "${BLUE}💻 Проверка исходного кода:${NC}"

check_item \
    "Backend main.ts" \
    "test -f packages/backend/src/main.ts" \
    "Backend точка входа найдена" \
    "Создайте packages/backend/src/main.ts"

check_item \
    "Admin страница" \
    "test -f packages/operator-admin/src/app/page.tsx" \
    "Admin главная страница найдена" \
    "Создайте packages/operator-admin/src/app/page.tsx"

# Проверка документации
echo -e "${BLUE}📚 Проверка документации:${NC}"

check_item \
    "README для деплоя" \
    "test -f README-VM-DEPLOY.md" \
    "Документация по деплою готова" \
    "Создайте README-VM-DEPLOY.md"

check_item \
    "Основной README" \
    "test -f README.md" \
    "Основной README готов" \
    "Создайте README.md"

# Итоговая статистика
echo -e "${BLUE}📊 Итоговая статистика:${NC}"
echo -e "${GREEN}✅ Пройдено: $PASSED_CHECKS${NC}"
echo -e "${RED}❌ Провалено: $FAILED_CHECKS${NC}"
echo -e "${BLUE}📋 Всего проверок: $TOTAL_CHECKS${NC}"

# Рекомендации
echo ""
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}🎉 Проект полностью готов к деплою на VM!${NC}"
    echo ""
    echo -e "${BLUE}Следующие шаги:${NC}"
    echo "1. Настройте переменные окружения: cp env-template.txt .env"
    echo "2. Установите зависимости: npm install"
    echo "3. Соберите проект: npm run build"
    echo "4. Запустите деплой: ./scripts/deploy-vm.sh <VM_IP> <SSH_KEY_PATH>"
else
    echo -e "${YELLOW}⚠️ Проект требует доработки перед деплоем${NC}"
    echo ""
    echo -e "${BLUE}Рекомендации:${NC}"
    echo "1. Исправьте все проваленные проверки"
    echo "2. Запустите скрипт очистки: ./scripts/clean-project.sh"
    echo "3. Повторите проверку: ./scripts/check-deploy-readiness.sh"
    echo "4. После исправления всех проблем запустите деплой"
fi

echo ""
echo -e "${BLUE}Для получения подробной информации смотрите README-VM-DEPLOY.md${NC}"

# Возвращаем код ошибки если есть проблемы
if [ $FAILED_CHECKS -gt 0 ]; then
    exit 1
fi
