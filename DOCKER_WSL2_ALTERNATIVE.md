# Альтернативная установка Docker через WSL 2

## 🚀 Установка Docker Engine в WSL 2

Если Docker Desktop не подходит, можно установить Docker Engine напрямую в WSL 2.

### 1. Установка WSL 2

```powershell
# Включение WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Включение виртуальной машины
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Перезагрузка
Restart-Computer
```

После перезагрузки:

```powershell
# Установка WSL 2
wsl --install -d Ubuntu

# Установка WSL 2 как версии по умолчанию
wsl --set-default-version 2
```

### 2. Установка Docker в Ubuntu WSL 2

Запустите Ubuntu WSL 2 и выполните:

```bash
# Обновление пакетов
sudo apt update

# Установка зависимостей
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Добавление GPG ключа Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление репозитория Docker
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Обновление пакетов
sudo apt update

# Установка Docker Engine
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Запуск Docker
sudo service docker start

# Проверка установки
docker --version
docker-compose --version
```

### 3. Настройка автозапуска Docker

Создайте файл `~/.bashrc` или добавьте в существующий:

```bash
# Автозапуск Docker при входе в WSL
if [ ! -e /var/run/docker.pid ]; then
    sudo service docker start
fi
```

### 4. Настройка WSL 2

Создайте файл `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
localhostForwarding=true
```

## 🔧 Настройка проекта в WSL 2

### 1. Переход в WSL 2

```powershell
# Переход в WSL 2
wsl

# Переход в директорию проекта
cd /mnt/c/Users/VIP/Desktop/bot/bot-test
```

### 2. Установка Make

```bash
# Установка Make
sudo apt install make

# Проверка установки
make --version
```

### 3. Запуск Docker контейнеров

```bash
# Сборка образов
make build

# Запуск в development режиме
make dev

# Проверка статуса
make status
```

## 🌐 Доступ к сервисам

После запуска контейнеров в WSL 2, сервисы будут доступны по адресам:

- **Backend**: http://localhost:3000
- **Admin**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🔄 Синхронизация с VM

### 1. Настройка Git в WSL 2

```bash
# Настройка Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Проверка remote
git remote -v
```

### 2. Синхронизация

```bash
# Автоматическая синхронизация
make sync-vm

# Или вручную
git add .
git commit -m "Update from WSL 2"
git push origin main
```

## 🚨 Решение проблем

### Проблема: "Permission denied" при запуске Docker

```bash
# Перезапуск WSL 2
exit
wsl --shutdown
wsl

# Перезапуск Docker
sudo service docker restart

# Проверка группы
groups $USER
```

### Проблема: "Cannot connect to the Docker daemon"

```bash
# Запуск Docker
sudo service docker start

# Проверка статуса
sudo service docker status
```

### Проблема: "Port already in use"

```bash
# Проверка занятых портов
netstat -tulpn | grep :3000

# Остановка контейнеров
make down

# Очистка
make clean
```

## 📚 Полезные команды WSL 2

```bash
# Информация о WSL
wsl --list --verbose

# Перезапуск WSL
wsl --shutdown

# Обновление WSL
wsl --update

# Удаление дистрибутива
wsl --unregister Ubuntu
```

## 🎯 Преимущества WSL 2 + Docker

1. **Лучшая производительность** - нативная Linux среда
2. **Полный доступ к Linux инструментам**
3. **Легкая интеграция с Windows**
4. **Автоматическое обновление через Windows Update**

## 🔄 Интеграция с Windows

### Доступ к файлам Windows

```bash
# Windows C: диск
/mnt/c/

# Windows D: диск
/mnt/d/

# Текущий проект
/mnt/c/Users/VIP/Desktop/bot/bot-test
```

### Запуск команд из Windows

```powershell
# Запуск команды в WSL 2
wsl make dev

# Запуск с параметрами
wsl make test-docker
```
