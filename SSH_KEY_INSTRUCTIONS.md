# Инструкция по использованию SSH ключа для подключения к VM

## 🔑 Созданный SSH ключ

**Дата создания**: 20.08.2025  
**Тип**: RSA 4096 бит  
**Комментарий**: bot-support-system@yandex-cloud

## 📁 Файлы ключа

### Приватный ключ (НЕ ПЕРЕДАВАТЬ!)
- **Файл**: `yandex-vm-key`
- **Размер**: 3.4 KB
- **Назначение**: Хранится локально для подключения к VM

### Публичный ключ (добавляется в VM)
- **Файл**: `yandex-vm-key.pub`
- **Размер**: 758 байт
- **Назначение**: Добавляется в `~/.ssh/authorized_keys` на VM

## 🚀 Подключение к VM

### Команда подключения:
```bash
ssh -i "yandex-vm-key" username@VM_IP
```

### Пример:
```bash
ssh -i "yandex-vm-key" ubuntu@51.250.123.456
```

## 📋 Пошаговая инструкция

### Шаг 1: Добавьте публичный ключ в VM

**Вариант A: Через Яндекс.Облако Console**
1. Войдите в [консоль Яндекс.Облака](https://console.cloud.yandex.ru/)
2. Найдите вашу VM
3. Нажмите "Подключиться" → "SSH"
4. Вставьте публичный ключ в поле "SSH ключ"

**Вариант B: Вручную на VM**
```bash
# На VM выполните:
mkdir -p ~/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCy9cbo+yXKZyUK7AN8+cG0ulkf8RLSGRlIhEq4fZ13/vtf2xG2FZ0A6mZK1FDGfbe8m5wTIKnLX1/uMPXv7Trm903ojyj0lrw++97LMOFekksOloryyKKSrYaHx4VRyJlEL16Y3MSrHXIJm7B5YLe9NB4guhsk19lhHvScNpquaatnQc41IhxJLoy2BO0nbLljfIOZaJwOsNcxJEcyf7/0z8+pgJnoCK5dsCtmX0r7wy4jSSgD1j2tmYsRIuZwv1mMEnjZ17KVz4sfOo4iOExXBxk3LvT85yevbiVMJyuNwbPwBU5qiUtdwA0QE3sfeTW/RHEIC/Nd705yonNPGf+2kB+zfABIvarsqnYyMpgBH+ZPpUs6sT+uBwDZvglmyVIj+LzcfzgofQppJ2gl7UlpuiH2xfMrhDxqb0DLZnCKoxbecW2kUkycKRQ0Wq/DdkbTrI1ThYsqjNj/IGKq4I857AumTk82iaJoqgkWV5b95UGQRWpV1GF+k85dBOI3IVRqzw6+rerUu4Q/Fu0usdIGfhlx14DUCxbRsjOV+JYta51VWRcrMZPnCWz7hwL6/P/AQe+Nx9QsC2cIeANjViJmVe3MYQLc9roMNzNbGeiQ6PM4MHffTLKvxa5llQ9QGwhB5z8+DGgWoeu1sR2trWKO4Brwl6crdGFi9YTaEv/9IQ== bot-support-system@yandex-cloud" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Шаг 2: Подключитесь к VM
```bash
# В PowerShell:
ssh -i "yandex-vm-key" ubuntu@VM_IP

# Или с полным путем:
ssh -i "C:\Users\VIP\Desktop\bot\bot-test\yandex-vm-key" ubuntu@VM_IP
```

### Шаг 3: При первом подключении
```
The authenticity of host 'VM_IP' can't be established.
ECDSA key fingerprint is SHA256:...
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```
**Ответьте: `yes`**

## 🔧 Настройка для удобства

### Создание SSH конфигурации:
```bash
# Создайте файл ~/.ssh/config (Windows: %USERPROFILE%\.ssh\config)
Host yandex-vm
    HostName VM_IP
    User ubuntu
    IdentityFile C:\Users\VIP\Desktop\bot\bot-test\yandex-vm-key
    IdentitiesOnly yes
```

### Теперь подключайтесь просто:
```bash
ssh yandex-vm
```

## ⚠️ Безопасность

- **НЕ передавайте** приватный ключ `yandex-vm-key`
- **НЕ публикуйте** приватный ключ в интернете
- **Сделайте резервную копию** ключа
- **Храните ключ** в безопасном месте

## 🚨 Решение проблем

### Ошибка "Permission denied":
```bash
# Проверьте права доступа к ключу
Get-Acl "yandex-vm-key" | Format-List

# Установите правильные права:
icacls "yandex-vm-key" /inheritance:r /grant:r "%USERNAME%:R"
```

### Ошибка "Bad permissions":
```bash
# Убедитесь, что ключ не доступен другим пользователям
# В PowerShell:
Get-Acl "yandex-vm-key" | Format-List
```

### Ошибка "Connection timed out":
- Проверьте IP адрес VM
- Убедитесь, что VM запущена
- Проверьте настройки firewall на VM

## 📱 Мобильные приложения

### JuiceSSH (Android):
1. Установите приложение
2. Создайте новое подключение
3. Загрузите приватный ключ
4. Введите IP и имя пользователя

### Termius (iOS/Android):
1. Установите приложение
2. Создайте новый хост
3. Загрузите приватный ключ
4. Настройте подключение

## 🔗 Связанная документация

- `README-VM-DEPLOY.md` - Полное руководство по деплою
- `ARCHIVE_INSTRUCTIONS.md` - Инструкция по использованию архивов
- `ecosystem.config.js` - Конфигурация PM2

---
**Статус**: SSH ключ создан и готов к использованию! 🎯
