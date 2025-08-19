# Инструкция по настройке проекта на VM

## ✅ Архивы переданы на VM

**IP адрес**: `84.201.146.125`  
**Пользователь**: `dankartsev`  
**Статус**: Архивы `dist-for-vm.zip` и `dist-for-vm.tar.gz` успешно переданы

## 🚀 Настройка на VM

### **Шаг 1: Подключитесь к VM по SSH**
```bash
ssh -i "yandex-vm-key" dankartsev@84.201.146.125
```

### **Шаг 2: Перейдите в директорию проекта**
```bash
cd ~/bot-project
ls -la  # Проверьте наличие архивов
```

### **Шаг 3: Распакуйте архив**
```bash
# Для ZIP архива:
unzip dist-for-vm.zip

# ИЛИ для TAR.GZ архива:
tar -xzf dist-for-vm.tar.gz

# Перейдите в директорию проекта:
cd dist
```

### **Шаг 4: Настройте переменные окружения**
```bash
# Скопируйте шаблон:
cp env-template.txt .env

# Отредактируйте файл (в Linux используйте nano):
nano .env
```

**В nano редакторе:**
- Используйте стрелки для навигации
- `Ctrl + X` для выхода
- `Y` для сохранения
- `Enter` для подтверждения имени файла

### **Шаг 5: Установите Node.js**
```bash
# Обновите пакеты:
sudo apt update

# Установите Node.js 18.x:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверьте версию:
node --version
npm --version
```

### **Шаг 6: Установите зависимости**
```bash
# Установите зависимости проекта:
npm install
```

### **Шаг 7: Установите и настройте PM2**
```bash
# Установите PM2 глобально:
sudo npm install -g pm2

# Запустите приложение:
pm2 start ecosystem.config.js

# Сохраните конфигурацию:
pm2 save
pm2 startup

# Проверьте статус:
pm2 status
pm2 logs
```

## 🔧 Основные команды nano:

- **Стрелки** - навигация по тексту
- **Ctrl + X** - выход
- **Ctrl + O** - сохранение
- **Ctrl + W** - поиск
- **Ctrl + K** - вырезать строку
- **Ctrl + U** - вставить

## 📋 Пример содержимого .env файла:

```bash
# Основные настройки
NODE_ENV=production
PORT=3000
ADMIN_PORT=3001

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bot_support
DB_USER=bot_user
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/bot

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=*
```

## 🚨 Решение проблем:

### **Ошибка "unzip: command not found"**
```bash
sudo apt update
sudo apt install unzip
```

### **Ошибка "npm: command not found"**
```bash
# Установите Node.js (см. Шаг 5)
```

### **Ошибка "Permission denied"**
```bash
# Проверьте права доступа:
ls -la
chmod 755 dist/
```

## 🔗 Полезные команды:

```bash
# Проверка статуса сервисов:
pm2 status
pm2 logs

# Перезапуск:
pm2 restart all

# Остановка:
pm2 stop all

# Мониторинг:
pm2 monit
```

## 📱 Проверка работы:

```bash
# Проверьте, что сервисы запущены:
curl http://localhost:3000/health
curl http://localhost:3001/health

# Проверьте логи:
pm2 logs
```

---
**Статус**: Архивы переданы, готовы к настройке на VM! 🎯
