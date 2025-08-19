# Инструкция по использованию архивов для деплоя на VM

## 📦 Созданные архивы

Проект подготовлен и упакован в два формата:

### 1. ZIP архив (Windows)
- **Файл**: `dist-for-vm.zip`
- **Размер**: ~149 KB
- **Содержимое**: Полная структура проекта для деплоя на VM
- **Использование**: Подходит для Windows и Linux систем

### 2. TAR.GZ архив (Linux)
- **Файл**: `dist-for-vm.tar.gz`
- **Размер**: ~94 KB
- **Содержимое**: Та же структура проекта, оптимизированная для Linux
- **Использование**: Рекомендуется для Linux VM

## 🚀 Способы передачи на VM

### Автоматический деплой (рекомендуется)
```bash
# Windows PowerShell
.\scripts\deploy-vm.ps1 -VMIP <VM_IP> -SSHKeyPath <SSH_KEY_PATH>

# Linux/Mac
./scripts/deploy-vm.sh <VM_IP> <SSH_KEY_PATH>
```

### Ручная передача
```bash
# Копирование ZIP архива
scp dist-for-vm.zip user@<VM_IP>:/home/user/

# Копирование TAR.GZ архива
scp dist-for-vm.tar.gz user@<VM_IP>:/home/user/
```

## 📁 Содержимое архива

```
dist/
├── admin/           # Admin панель (Next.js исходники)
├── app/            # Backend приложение
├── bot/            # Telegram bot
├── http/           # HTTP сервер
├── shared/         # Общие типы
├── package.json    # Зависимости
├── ecosystem.config.js  # PM2 конфигурация
└── env-template.txt     # Шаблон переменных окружения
```

## 🔧 Распаковка на VM

### ZIP архив
```bash
unzip dist-for-vm.zip
cd dist
```

### TAR.GZ архив
```bash
tar -xzf dist-for-vm.tar.gz
cd dist
```

## 📋 Следующие шаги на VM

После распаковки архива на VM:

1. **Настройка переменных окружения**:
   ```bash
   cp env-template.txt .env
   nano .env  # Редактирование настроек
   ```

2. **Установка зависимостей**:
   ```bash
   npm install
   ```

3. **Запуск через PM2**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## ⚠️ Важные замечания

- **Размер**: Архивы содержат только исходный код, без `node_modules`
- **Зависимости**: Устанавливаются отдельно на VM через `npm install`
- **Конфигурация**: Требует настройки переменных окружения
- **Порты**: Убедитесь, что порты 3000 (backend) и 3001 (admin) свободны на VM

## 🔗 Связанная документация

- `README-VM-DEPLOY.md` - Полное руководство по деплою
- `ecosystem.config.js` - Конфигурация PM2
- `env-template.txt` - Шаблон переменных окружения

---
**Дата создания**: 20.08.2025  
**Статус**: Готов к деплою на VM Яндекс.Облака 🚀
