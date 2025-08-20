# Установка Docker Desktop для Windows

## 📋 Требования

- Windows 10/11 Pro, Enterprise или Education (64-bit)
- WSL 2 (Windows Subsystem for Linux 2)
- Виртуализация включена в BIOS

## 🚀 Пошаговая установка

### 1. Включение виртуализации

1. Перезагрузите компьютер и войдите в BIOS
2. Найдите настройки виртуализации (обычно в Advanced или CPU Configuration)
3. Включите:
   - Intel VT-x / AMD-V
   - Intel VT-d / AMD IOMMU
4. Сохраните и перезагрузитесь

### 2. Установка WSL 2

Откройте PowerShell от имени администратора и выполните:

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
wsl --install

# Установка Ubuntu (или другой дистрибутив)
wsl --install -d Ubuntu

# Установка WSL 2 как версии по умолчанию
wsl --set-default-version 2
```

### 3. Скачивание Docker Desktop

1. Перейдите на [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Скачайте Docker Desktop для Windows
3. Запустите установщик

### 4. Установка

1. Запустите `Docker Desktop Installer.exe`
2. Следуйте инструкциям установщика
3. При запросе выберите "Use WSL 2 instead of Hyper-V"
4. Дождитесь завершения установки
5. Перезагрузите компьютер

### 5. Первый запуск

1. Запустите Docker Desktop
2. Дождитесь инициализации (может занять несколько минут)
3. Примите условия использования
4. Дождитесь появления сообщения "Docker Desktop is running"

## ✅ Проверка установки

Откройте PowerShell и выполните:

```powershell
# Проверка версии Docker
docker --version

# Проверка версии Docker Compose
docker-compose --version

# Проверка статуса
docker info

# Тестовый запуск
docker run hello-world
```

## 🔧 Настройка

### Настройка WSL 2

Создайте файл `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
localhostForwarding=true
```

### Настройка Docker Desktop

1. Откройте Docker Desktop
2. Перейдите в Settings → Resources
3. Настройте:
   - Memory: 4-8 GB
   - CPUs: 2-4
   - Disk image size: 64 GB

## 🚨 Решение проблем

### Проблема: "WSL 2 installation is incomplete"

```powershell
# Обновление WSL
wsl --update

# Перезапуск WSL
wsl --shutdown
wsl
```

### Проблема: "Docker Desktop failed to start"

1. Проверьте, что WSL 2 работает:
   ```powershell
   wsl --status
   ```

2. Перезапустите Docker Desktop

3. Проверьте логи в Event Viewer

### Проблема: "Hyper-V is not available"

1. Включите Hyper-V в Windows Features
2. Или используйте WSL 2 (рекомендуется)

## 📚 Дополнительные ресурсы

- [Официальная документация Docker](https://docs.docker.com/desktop/windows/)
- [WSL 2 документация](https://docs.microsoft.com/en-us/windows/wsl/)
- [Troubleshooting Docker Desktop](https://docs.docker.com/desktop/troubleshoot/)

## 🎯 Следующие шаги

После успешной установки Docker Desktop:

1. Проверьте работу: `docker run hello-world`
2. Перейдите к настройке проекта: `README_DOCKER.md`
3. Запустите тесты: `make test-docker-auto`
