# Docker - Быстрый старт

## 🚀 Быстрый запуск

```bash
# 1. Скопируйте переменные окружения
cp docker.env .env
# Отредактируйте .env с вашими реальными значениями

# 2. Запустите в режиме разработки
make dev

# 3. Или в production режиме
make prod
```

## 📋 Основные команды

```bash
make help          # Показать все команды
make dev           # Запустить development окружение
make prod          # Запустить production окружение
make build         # Собрать все образы
make up            # Запустить сервисы
make down          # Остановить сервисы
make logs          # Показать логи
make status        # Показать статус
make health        # Проверить health check
make test-docker   # Протестировать конфигурацию
make clean         # Очистить все ресурсы
```

## 🔄 Синхронизация с VM

```bash
# Автоматическая синхронизация
make sync-vm-auto

# Или вручную
git add .
git commit -m "Update Docker config"
git push origin main
```

## 🧪 Тестирование

```bash
# Полное тестирование Docker конфигурации
make test-docker-auto

# Проверка health check
make health

# Проверка статуса сервисов
make status
```

## 📚 Документация

- [Подробное руководство](DOCKER_README.md)
- [Руководство по миграции](MIGRATION_GUIDE.md)
- [Переменные окружения](docker.env)

## 🆘 Поддержка

При проблемах:
1. `make logs` - проверьте логи
2. `make status` - проверьте статус
3. `make health` - проверьте health check
4. `make clean && make build` - пересоберите образы

## 🌐 Доступные сервисы

- **Backend**: http://localhost:3000
- **Admin**: http://localhost:3001
- **Health Check**: http://localhost:3000/api/health
- **Docs**: http://localhost:3000/docs (если включены)
