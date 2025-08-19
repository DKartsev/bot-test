#!/bin/bash

# Скрипт деплоя на VM Яндекс.Облака
# Использование: ./scripts/deploy-vm.sh [VM_IP] [SSH_KEY_PATH]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка аргументов
if [ $# -lt 2 ]; then
    echo -e "${RED}Ошибка: Необходимо указать IP адрес VM и путь к SSH ключу${NC}"
    echo "Использование: $0 <VM_IP> <SSH_KEY_PATH>"
    echo "Пример: $0 192.168.1.100 ~/.ssh/id_rsa"
    exit 1
fi

VM_IP=$1
SSH_KEY_PATH=$2
REMOTE_USER="ubuntu"
REMOTE_DIR="/opt/bot-support-system"

echo -e "${GREEN}🚀 Начинаем деплой на VM ${VM_IP}${NC}"

# Проверка SSH ключа
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}Ошибка: SSH ключ не найден: $SSH_KEY_PATH${NC}"
    exit 1
fi

# Проверка подключения к VM
echo -e "${YELLOW}Проверяем подключение к VM...${NC}"
if ! ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$REMOTE_USER@$VM_IP" "echo 'Подключение успешно'" 2>/dev/null; then
    echo -e "${RED}Ошибка: Не удается подключиться к VM${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Подключение к VM установлено${NC}"

# Сборка проекта локально
echo -e "${YELLOW}Собираем проект...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Ошибка при сборке проекта${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Проект собран${NC}"

# Создание архива для деплоя
echo -e "${YELLOW}Создаем архив для деплоя...${NC}"
DEPLOY_ARCHIVE="deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# Создаем временную директорию для деплоя
TEMP_DIR=$(mktemp -d)
cp -r dist "$TEMP_DIR/"
cp -r packages/operator-admin/.next "$TEMP_DIR/admin-next"
cp -r packages/operator-admin/public "$TEMP_DIR/admin-public"
cp -r packages/operator-admin/next.config.js "$TEMP_DIR/"
cp -r packages/operator-admin/package.json "$TEMP_DIR/admin-package.json"
cp package.json "$TEMP_DIR/"
cp ecosystem.config.js "$TEMP_DIR/"
cp docker-compose.yml "$TEMP_DIR/"
cp -r nginx "$TEMP_DIR/"
cp env-template.txt "$TEMP_DIR/.env.example"

# Создаем архив
tar -czf "$DEPLOY_ARCHIVE" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ Архив создан: $DEPLOY_ARCHIVE${NC}"

# Копирование архива на VM
echo -e "${YELLOW}Копируем архив на VM...${NC}"
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$DEPLOY_ARCHIVE" "$REMOTE_USER@$VM_IP:/tmp/"

# Выполнение команд на VM
echo -e "${YELLOW}Выполняем деплой на VM...${NC}"
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$REMOTE_USER@$VM_IP" << 'EOF'
    set -e
    
    # Создание директории приложения
    sudo mkdir -p /opt/bot-support-system
    sudo chown $USER:$USER /opt/bot-support-system
    
    # Переход в директорию
    cd /opt/bot-support-system
    
    # Распаковка архива
    tar -xzf "/tmp/$(basename /tmp/deploy-*.tar.gz)"
    
    # Установка зависимостей
    npm ci --only=production
    
    # Установка зависимостей для admin
    cd admin-next
    npm ci --only=production
    cd ..
    
    # Создание директорий для логов
    mkdir -p logs data uploads
    
    # Настройка прав доступа
    sudo chown -R $USER:$USER /opt/bot-support-system
    
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
EOF

# Очистка локального архива
rm -f "$DEPLOY_ARCHIVE"

echo -e "${GREEN}🎉 Деплой завершен успешно!${NC}"
echo -e "${YELLOW}Приложение доступно по адресу: http://${VM_IP}${NC}"
echo -e "${YELLOW}Admin панель: http://${VM_IP}:3001${NC}"
echo -e "${YELLOW}API: http://${VM_IP}:3000/api${NC}"
echo ""
echo -e "${GREEN}Полезные команды:${NC}"
echo "  SSH подключение: ssh -i $SSH_KEY_PATH $REMOTE_USER@$VM_IP"
echo "  Просмотр логов: ssh -i $SSH_KEY_PATH $REMOTE_USER@$VM_IP 'pm2 logs'"
echo "  Перезапуск: ssh -i $SSH_KEY_PATH $REMOTE_USER@$VM_IP 'pm2 restart all'"
echo "  Статус: ssh -i $SSH_KEY_PATH $REMOTE_USER@$VM_IP 'pm2 status'"
