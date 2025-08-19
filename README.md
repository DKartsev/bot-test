# 🤖 Bot Support System

**Support bot с операторской панелью - объединенный деплой на VM**

Этот проект объединяет backend (Fastify + Telegraf bot) и operator/admin (Next.js) в единую систему для запуска на одной виртуальной машине Яндекс.Облака.

## 🚀 Быстрый старт

1. **Клонируйте репозиторий**
   ```bash
   git clone <your-repo>
   cd bot-support-system
   ```

2. **Настройте окружение**
   ```bash
   cp env-template.txt .env
   # Отредактируйте .env файл
   ```

3. **Соберите проект**
   ```bash
   npm install
   npm run build
   ```

4. **Деплой на VM**
   ```bash
   # Linux/macOS
   ./scripts/deploy-vm.sh <VM_IP> <SSH_KEY_PATH>
   
   # Windows PowerShell
   .\scripts\deploy-vm.ps1 -VMIP <VM_IP> -SSHKeyPath <SSH_KEY_PATH>
   ```

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (80/443)│────│  Backend (3000) │────│  Admin (3001)   │
│   (опционально) │    │  Fastify + Bot  │    │   Next.js App   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Управление

- **PM2**: `pm2 start ecosystem.config.js`
- **Docker**: `docker-compose up -d`
- **Systemd**: `sudo systemctl start bot-support`

## 🧹 Очистка проекта

```bash
# Linux/macOS
./scripts/clean-project.sh

# Windows PowerShell
.\scripts\clean-project.ps1
```

## 📚 Документация

- **[📖 Полное руководство по деплою и старту ВМ](README-VM-DEPLOY.md)** - пошаговые инструкции с указанием, что и куда вставлять
- **[🔄 Руководство по миграции](MIGRATION_TO_VM.md)** - процесс миграции с Render
- **[📋 Сводка выполненной работы](DEPLOYMENT_SUMMARY.md)** - что было сделано

## 🐳 Docker

```bash
docker-compose up -d
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `pm2 logs`
2. Запустите скрипт проверки готовности
3. Обратитесь к документации в `README-VM-DEPLOY.md`

---

**MIT License**
