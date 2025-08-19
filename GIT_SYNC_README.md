# 🔄 Git Синхронизация

## 🚀 Быстрый старт

### Windows (PowerShell)
```powershell
# Полная синхронизация
.\scripts\git-sync.ps1 sync

# Отправить изменения на VM
.\scripts\git-sync.ps1 push

# Получить изменения с VM
.\scripts\git-sync.ps1 pull

# Проверить статус синхронизации
.\scripts\git-sync.ps1 status
```

### Linux/Mac (Bash)
```bash
# Полная синхронизация
./scripts/git-sync.sh sync

# Отправить изменения на VM
./scripts/git-sync.sh push

# Получить изменения с VM
./scripts/git-sync.sh pull

# Проверить статус синхронизации
./scripts/git-sync.sh status
```

## ⚡ Преимущества Git синхронизации

### ✅ **Быстро и надёжно**
- Передаются только изменения (diff)
- Автоматическое сжатие
- Проверка целостности данных

### ✅ **Полный контроль версий**
- История изменений
- Откат к предыдущим версиям
- Просмотр diff между версиями

### ✅ **Автоматическая синхронизация**
- Автоматические коммиты с timestamp
- Проверка статуса синхронизации
- Безопасное слияние изменений

## 🔧 Настройка

### 1. Настройка удаленного репозитория на VM
```bash
# На VM выполните:
ssh -l dankartsev 84.201.146.125
cd ~/bot-project
git remote add origin https://github.com/DKartsev/bot-test.git
git branch -M main
git push -u origin main
```

### 2. Настройка Git пользователя на VM
```bash
# На VM выполните:
git config --global user.name "Bot Support VM"
git config --global user.email "vm@bot-support.local"
```

### 3. Первая синхронизация
```powershell
# Локально выполните:
.\scripts\git-sync.ps1 sync
```

## 🎯 Команды

### `sync` - Полная синхронизация
1. Коммитит локальные изменения
2. Отправляет в GitHub
3. Обновляет VM из GitHub
4. Показывает статус

### `push` - Отправить изменения на VM
1. Коммитит локальные изменения  
2. Отправляет в GitHub
3. Обновляет VM

### `pull` - Получить изменения с VM
1. Коммитит изменения на VM
2. Отправляет с VM в GitHub  
3. Обновляет локальный репозиторий

### `status` - Проверить синхронизацию
1. Показывает Git статус локально и на VM
2. Сравнивает последние коммиты
3. Показывает, синхронизированы ли репозитории

## 🔄 Рабочий процесс

### Ежедневная работа
```powershell
# Утром - получить изменения
.\scripts\git-sync.ps1 pull

# В процессе работы - проверить статус
.\scripts\git-sync.ps1 status

# Вечером - отправить изменения
.\scripts\git-sync.ps1 push
```

### При изменениях в коде
```powershell
# После каждого значимого изменения
.\scripts\git-sync.ps1 sync
```

## 🛠️ Устранение проблем

### Конфликты слияния
```bash
# Если возникли конфликты:
git status
git diff
# Исправьте конфликты в файлах
git add .
git commit -m "Resolve merge conflicts"
```

### Сброс до последней синхронизации
```bash
# Локально:
git reset --hard origin/main

# На VM:
ssh -l dankartsev 84.201.146.125 "cd ~/bot-project && git reset --hard origin/main"
```

### Принудительная синхронизация
```bash
# Если репозитории сильно разошлись:
git push origin main --force
```

## 📊 Мониторинг

Используйте `status` для регулярной проверки:
```powershell
.\scripts\git-sync.ps1 status
```

**Результат:**
- ✅ "Репозитории синхронизированы!" - всё в порядке
- ❌ "Репозитории НЕ синхронизированы!" - нужна синхронизация

## 🎯 Автоматизация

Для автоматической синхронизации добавьте в cron (Linux) или Task Scheduler (Windows):

### Linux cron
```bash
# Каждые 30 минут
*/30 * * * * cd /path/to/project && ./scripts/git-sync.sh sync
```

### Windows Task Scheduler
```powershell
# Создать задачу на выполнение каждые 30 минут
schtasks /create /tn "Git Sync" /tr "powershell.exe -File C:\path\to\project\scripts\git-sync.ps1 sync" /sc minute /mo 30
```
