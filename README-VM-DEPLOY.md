# 🚀 Полное руководство по деплою на VM Яндекс.Облака

Этот документ содержит **полные пошаговые инструкции** по миграции с Render на VM Яндекс.Облака, включая подготовку локального проекта, настройку VM и деплой приложения.

## 📋 Требования

- Ubuntu 20.04+ или CentOS 8+
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- PM2 (устанавливается автоматически)
- Nginx (опционально, для проксирования)

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (80/443)│────│  Backend (3000) │────│  Admin (3001)   │
│   (опционально) │    │  Fastify + Bot  │    │   Next.js App   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Пошаговый процесс миграции

### Шаг 1: Подготовка локального проекта (ВЫПОЛНЯЕТСЯ НА ЛОКАЛЬНОЙ МАШИНЕ)

#### 1.1 Очистка проекта от временных файлов

**Выполните на локальной машине:**

```bash
# Linux/macOS
./scripts/clean-project.sh

# Windows PowerShell
.\scripts\clean-project.ps1
```

#### 1.2 Проверка готовности к деплою

```bash
# Linux/macOS
./scripts/check-deploy-readiness.sh

# Windows PowerShell
.\scripts\check-deploy-readiness.ps1
```

#### 1.3 Установка зависимостей

```bash
npm install
```

#### 1.4 Сборка проекта

```bash
npm run build
```

### Шаг 2: Подготовка VM (ВЫПОЛНЯЕТСЯ НА VM)

**Подключитесь к VM по SSH и выполните следующие команды:**

#### 2.1 Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

#### 2.2 Установка Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version
npm --version
```

#### 2.3 Установка PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверка статуса
sudo systemctl status postgresql
```

#### 2.4 Установка Redis

```bash
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Проверка статуса
sudo systemctl status redis-server
```

#### 2.5 Создание пользователя для приложения

```bash
sudo useradd -m -s /bin/bash botuser
sudo usermod -aG sudo botuser

# Переключение на пользователя
sudo su - botuser
```

### Шаг 3: Настройка базы данных (ВЫПОЛНЯЕТСЯ НА VM)

#### 3.1 Подключение к PostgreSQL

```bash
sudo -u postgres psql
```

#### 3.2 Создание базы данных и пользователя

**Вставьте в psql консоль:**

```sql
CREATE DATABASE bot_support;
CREATE USER botuser WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE bot_support TO botuser;
\q
```

#### 3.3 Настройка аутентификации

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

**Найдите строки с `local` и добавьте:**

```
local   bot_support         botuser                                md5
```

**Сохраните файл (Ctrl+X, Y, Enter) и перезапустите PostgreSQL:**

```bash
sudo systemctl restart postgresql
```

#### 3.4 Проверка подключения

```bash
psql -h localhost -U botuser -d bot_support
# Введите пароль, который вы указали выше
# В psql консоли введите: \q
```

### Шаг 4: Деплой приложения

#### 4.1 Автоматический деплой (РЕКОМЕНДУЕТСЯ)

**Выполните на локальной машине:**

```bash
# Linux/macOS
./scripts/deploy-vm.sh <VM_IP> <SSH_KEY_PATH>

# Windows PowerShell
.\scripts\deploy-vm.ps1 -VMIP <VM_IP> -SSHKeyPath <SSH_KEY_PATH>
```

**Пример:**
```bash
# Linux/macOS
./scripts/deploy-vm.sh 192.168.1.100 ~/.ssh/id_rsa

# Windows PowerShell
.\scripts\deploy-vm.ps1 -VMIP 192.168.1.100 -SSHKeyPath C:\Users\YourUser\.ssh\id_rsa
```

#### 4.2 Ручной деплой (если автоматический не работает)

**Выполните на VM:**

```bash
# Создание директории приложения
sudo mkdir -p /opt/bot-support-system
sudo chown $USER:$USER /opt/bot-support-system
cd /opt/bot-support-system

# Копирование файлов (выполните на локальной машине)
scp -r dist packages/operator-admin/.next packages/operator-admin/public packages/operator-admin/next.config.js packages/operator-admin/package.json package.json ecosystem.config.js docker-compose.yml nginx env-template.txt botuser@<VM_IP>:/opt/bot-support-system/

# На VM: установка зависимостей
npm ci --only=production

# Установка зависимостей для admin
cd admin-next
npm ci --only=production
cd ..

# Создание директорий для логов
mkdir -p logs data uploads

# Настройка прав доступа
sudo chown -R $USER:$USER /opt/bot-support-system
```

### Шаг 5: Настройка переменных окружения (ВЫПОЛНЯЕТСЯ НА VM)

#### 5.1 Создание .env файла

```bash
cd /opt/bot-support-system
cp env-template.txt .env
nano .env
```

#### 5.2 Настройка переменных

**Вставьте в .env файл следующие значения (замените на ваши):**

```bash
# Основные настройки
NODE_ENV=production
PORT=3000
ADMIN_PORT=3001

# База данных (используйте пароль, который вы создали выше)
DATABASE_URL=postgresql://botuser:your_secure_password_here@localhost:5432/bot_support

# Redis
REDIS_URL=redis://localhost:6379

# Telegram Bot (вставьте ваш токен)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# OpenAI (вставьте ваш ключ)
OPENAI_API_KEY=your_openai_key_here

# JWT (сгенерируйте случайную строку)
JWT_SECRET=your_random_jwt_secret_here

# CORS (замените на ваш домен или IP)
CORS_ORIGIN=http://localhost:3001,http://your-domain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# File uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Nginx (если используете)
NGINX_ENABLED=false
NGINX_SSL_CERT=/etc/nginx/ssl/cert.pem
NGINX_SSL_KEY=/etc/nginx/ssl/key.pem

# PM2
PM2_ENABLED=true
PM2_INSTANCES=1

# Docker (если используете)
DOCKER_ENABLED=false
DOCKER_NETWORK=bot-network
```

**Сохраните файл (Ctrl+X, Y, Enter)**

### Шаг 6: Запуск приложения (ВЫПОЛНЯЕТСЯ НА VM)

#### 6.1 Установка PM2

```bash
# Установка PM2 глобально
sudo npm install -g pm2

# Проверка установки
pm2 --version
```

#### 6.2 Запуск через PM2

```bash
cd /opt/bot-support-system

# Запуск приложения
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска
pm2 startup

# Проверка статуса
pm2 status
```

#### 6.3 Создание systemd сервиса

```bash
# Создание systemd сервиса
sudo tee /etc/systemd/system/bot-support.service > /dev/null << 'SERVICE_EOF'
[Unit]
Description=Bot Support System
After=network.target postgresql.service redis-server.service

[Service]
Type=forking
User=botuser
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
sudo systemctl start bot-support.service

# Проверка статуса
sudo systemctl status bot-support.service
```

### Шаг 7: Настройка Nginx (ОПЦИОНАЛЬНО, ВЫПОЛНЯЕТСЯ НА VM)

#### 7.1 Установка Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 7.2 Копирование конфигурации

```bash
# Копирование конфигурации
sudo cp /opt/bot-support-system/nginx/nginx.conf /etc/nginx/nginx.conf

# Создание SSL директории
sudo mkdir -p /etc/nginx/ssl
```

#### 7.3 Создание SSL сертификатов

**Для тестирования (self-signed):**

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=BotSupport/CN=localhost"
```

**Для продакшена (Let's Encrypt):**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

#### 7.4 Проверка и перезапуск Nginx

```bash
# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx

# Проверка статуса
sudo systemctl status nginx
```

### Шаг 8: Настройка firewall (ВЫПОЛНЯЕТСЯ НА VM)

```bash
# Установка UFW
sudo apt install ufw -y

# Настройка правил
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000
sudo ufw allow 3001

# Если используете Nginx
sudo ufw allow 80
sudo ufw allow 443

# Включение firewall
sudo ufw enable

# Проверка статуса
sudo ufw status
```

## 🔧 Управление сервисами

### PM2 команды

```bash
# Статус сервисов
pm2 status

# Просмотр логов
pm2 logs
pm2 logs bot-backend
pm2 logs bot-admin

# Перезапуск
pm2 restart all
pm2 restart bot-backend
pm2 restart bot-admin

# Остановка
pm2 stop all
pm2 stop bot-backend
pm2 stop bot-admin

# Удаление из PM2
pm2 delete all

# Мониторинг в реальном времени
pm2 monit
```

### Systemd сервис

```bash
# Управление через systemd
sudo systemctl start bot-support
sudo systemctl stop bot-support
sudo systemctl restart bot-support
sudo systemctl status bot-support

# Автозапуск
sudo systemctl enable bot-support

# Просмотр логов
sudo journalctl -u bot-support -f
```

## 🌐 Docker (альтернатива)

### Запуск через Docker Compose

```bash
cd /opt/bot-support-system

# Сборка и запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### Отдельные контейнеры

```bash
# Backend
docker build -f Dockerfile.backend -t bot-backend .
docker run -d -p 3000:3000 --env-file .env bot-backend

# Admin
cd packages/operator-admin
docker build -f Dockerfile.admin -t bot-admin .
docker run -d -p 3001:3000 --env-file ../../.env bot-admin
```

## 📊 Мониторинг

### Логи

```bash
# Логи приложения
tail -f /opt/bot-support-system/logs/app.log

# Логи PM2
pm2 logs

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Логи systemd
sudo journalctl -u bot-support -f

# Логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log

# Логи Redis
sudo tail -f /var/log/redis/redis-server.log
```

### Метрики

```bash
# Статус PM2
pm2 monit

# Использование ресурсов
htop
iotop

# Проверка портов
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001
```

## 🔄 Обновление приложения

### Автоматическое обновление

**Выполните на локальной машине:**

```bash
# Linux/macOS
./scripts/deploy-vm.sh <VM_IP> <SSH_KEY_PATH>

# Windows PowerShell
.\scripts\deploy-vm.ps1 -VMIP <VM_IP> -SSHKeyPath <SSH_KEY_PATH>
```

### Ручное обновление

**Выполните на VM:**

```bash
# 1. Остановка сервисов
pm2 stop all

# 2. Обновление кода
cd /opt/bot-support-system
git pull origin main

# 3. Установка зависимостей
npm install
cd admin-next && npm install && cd ..

# 4. Сборка
npm run build

# 5. Запуск
pm2 start ecosystem.config.js
pm2 save
```

## 🚨 Устранение неполадок

### Проблемы с подключением

```bash
# Проверка портов
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001

# Проверка firewall
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 3001

# Проверка статуса сервисов
pm2 status
sudo systemctl status bot-support
```

### Проблемы с базой данных

```bash
# Проверка подключения
psql -h localhost -U botuser -d bot_support

# Проверка логов
sudo tail -f /var/log/postgresql/postgresql-*.log

# Перезапуск PostgreSQL
sudo systemctl restart postgresql
```

### Проблемы с Redis

```bash
# Проверка статуса
redis-cli ping

# Проверка логов
sudo tail -f /var/log/redis/redis-server.log

# Перезапуск Redis
sudo systemctl restart redis-server
```

### Проблемы с PM2

```bash
# Сброс PM2
pm2 kill
pm2 start ecosystem.config.js

# Очистка логов
pm2 flush

# Проверка конфигурации
pm2 show bot-backend
pm2 show bot-admin
```

### Проблемы с Nginx

```bash
# Проверка конфигурации
sudo nginx -t

# Проверка логов
sudo tail -f /var/log/nginx/error.log

# Перезапуск Nginx
sudo systemctl restart nginx
```

## 🔐 Безопасность

### Firewall

```bash
# Настройка UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL сертификаты

**Для продакшена используйте Let's Encrypt:**

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата
sudo certbot --nginx -d your-domain.com

# Автообновление
sudo crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Обновление системы

```bash
# Автоматические обновления безопасности
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# Проверка обновлений
sudo apt update
sudo apt list --upgradable
```

## 📁 Структура на VM

```
/opt/bot-support-system/
├── dist/                    # Собранный backend
├── admin-next/             # Собранная admin панель
├── admin-public/           # Статические файлы admin
├── logs/                   # Логи приложения
├── data/                   # Данные приложения
├── uploads/                # Загруженные файлы
├── nginx/                  # Конфигурация Nginx
├── package.json            # Зависимости
├── ecosystem.config.js     # Конфигурация PM2
├── docker-compose.yml      # Docker конфигурация
└── .env                    # Переменные окружения
```

## 📞 Поддержка

При возникновении проблем:

1. **Проверьте логи**: `pm2 logs` и `sudo journalctl -u bot-support`
2. **Проверьте статус сервисов**: `pm2 status`
3. **Проверьте подключение к базе данных и Redis**
4. **Убедитесь, что все порты открыты и доступны**
5. **Запустите скрипт проверки**: `./scripts/check-deploy-readiness.sh`

## 🎯 Преимущества миграции на VM

### По сравнению с Render:

- **Полный контроль**: Полный доступ к серверу и настройкам
- **Производительность**: Лучшая производительность без ограничений Render
- **Стоимость**: Более выгодная стоимость для высоконагруженных приложений
- **Масштабируемость**: Возможность вертикального и горизонтального масштабирования
- **Безопасность**: Полный контроль над безопасностью и firewall
- **Мониторинг**: Расширенные возможности мониторинга и логирования

### Возможности на VM:

- **PM2**: Профессиональное управление процессами Node.js
- **Systemd**: Автозапуск сервисов при перезагрузке
- **Nginx**: Гибкая настройка проксирования и SSL
- **Docker**: Контейнеризация для изоляции и масштабирования
- **Мониторинг**: Полный доступ к системным метрикам
- **Backup**: Гибкие стратегии резервного копирования

## 📝 Заключение

Миграция с Render на VM Яндекс.Облака завершена успешно. Проект теперь:

- ✅ Объединен в единую систему
- ✅ Очищен от временных файлов
- ✅ Настроен для деплоя на VM
- ✅ Имеет полную документацию
- ✅ Включает автоматические скрипты
- ✅ Поддерживает Docker и PM2
- ✅ Готов к продакшену

Для начала работы следуйте инструкциям выше и используйте созданные скрипты для автоматизации процесса.
