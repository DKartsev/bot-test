# Docker Guide для Bot Support System

## Обзор

Этот проект использует Docker для обеспечения идентичности окружения между локальной разработкой и продакшеном. Это решает проблему "работает у меня, но не работает на сервере".

## Архитектура

Проект состоит из следующих сервисов:

- **bot-backend** - основной backend сервис (Node.js/Fastify)
- **bot-admin** - admin панель для операторов
- **postgres** - база данных PostgreSQL
- **redis** - кэш и сессии
- **nginx** - reverse proxy и статические файлы

## Быстрый старт

### 1. Установка Docker

Убедитесь, что у вас установлен Docker и Docker Compose:

```bash
docker --version
docker-compose --version
```

### 2. Настройка переменных окружения

Скопируйте и настройте файл с переменными окружения:

```bash
cp docker.env .env
# Отредактируйте .env файл с вашими реальными значениями
```

### 3. Запуск в режиме разработки

```bash
# Собрать и запустить все сервисы
make dev

# Или вручную
docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev up -d
```

### 4. Запуск в production режиме

```bash
# Собрать и запустить production сервисы
make prod

# Или вручную
docker-compose --profile production up -d
```

## Основные команды

### Make команды (рекомендуется)

```bash
make help          # Показать все доступные команды
make build         # Собрать все образы
make up            # Запустить все сервисы
make down          # Остановить все сервисы
make dev           # Запустить в режиме разработки
make prod          # Запустить в production режиме
make logs          # Показать логи всех сервисов
make status        # Показать статус сервисов
make health        # Проверить health check
make clean         # Очистить все контейнеры и образы
```

### Docker Compose команды

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f

# Пересборка
docker-compose build --no-cache

# Перезапуск конкретного сервиса
docker-compose restart bot-backend
```

## Режимы работы

### Development режим

- Hot reload для backend и admin
- Монтирование исходного кода в контейнеры
- Отладочные логи
- Все dev зависимости установлены

```bash
make dev
```

### Production режим

- Оптимизированные образы
- Только production зависимости
- Nginx для проксирования
- Health checks
- Автоматический restart

```bash
make prod
```

## Структура файлов

```
├── docker-compose.yml              # Основная конфигурация
├── docker-compose.override.yml     # Переопределения для разработки
├── Dockerfile.backend              # Backend образ
├── packages/operator-admin/
│   └── Dockerfile.admin           # Admin панель образ
├── docker.env                      # Переменные окружения
├── .dockerignore                   # Исключения для Docker
├── Makefile                       # Команды для упрощения работы
└── nginx/                         # Nginx конфигурация
```

## Переменные окружения

Основные переменные в `docker.env`:

- `NODE_ENV` - окружение (development/production)
- `BUILD_TARGET` - target для Docker build
- `DATABASE_URL` - строка подключения к PostgreSQL
- `REDIS_URL` - строка подключения к Redis
- `BACKEND_URL` - URL backend сервиса
- `PORT` - порт для сервисов

## Мониторинг и логи

### Health Checks

Все сервисы имеют health check endpoints:

- Backend: `http://localhost:3000/health`
- Admin: `http://localhost:3001/health`

### Логи

```bash
# Все логи
make logs

# Логи конкретного сервиса
make logs-backend
make logs-admin
```

### Статус

```bash
make status
make health
```

## Troubleshooting

### Проблемы с портами

Если порты заняты, измените их в `docker.env`:

```bash
BACKEND_PORT=3001
ADMIN_PORT=3002
```

### Проблемы с базой данных

```bash
# Подключиться к PostgreSQL
make shell-postgres

# Проверить подключение
docker-compose exec postgres psql -U bot_user -d bot_support -c "SELECT version();"
```

### Очистка

```bash
# Полная очистка
make clean

# Только контейнеры
docker-compose down
```

## Синхронизация с VM

Для синхронизации кода с VM используйте:

```bash
make sync-vm
```

Это автоматически:
1. Добавит все изменения в git
2. Создаст коммит
3. Отправит изменения на удаленный репозиторий

## Production развертывание

### 1. Подготовка

```bash
# Собрать production образы
make build-prod

# Проверить конфигурацию
docker-compose config
```

### 2. Развертывание

```bash
# Развернуть в production
make deploy

# Или вручную
docker-compose --profile production up -d
```

### 3. Откат

```bash
# Откатиться к предыдущей версии
make rollback
```

## Безопасность

- Все сервисы запускаются от непривилегированного пользователя
- Используются только необходимые порты
- Переменные окружения не хардкодятся в образы
- Health checks для мониторинга состояния

## Производительность

- Multi-stage builds для оптимизации размера образов
- Кэширование слоев Docker
- Оптимизированный .dockerignore
- Использование Alpine Linux для базовых образов

## Дополнительные возможности

### Добавление нового сервиса

1. Создайте Dockerfile для сервиса
2. Добавьте сервис в `docker-compose.yml`
3. Настройте зависимости и сети
4. Добавьте команды в Makefile

### Кастомные образы

Для кастомных образов создайте отдельный Dockerfile и добавьте в docker-compose.yml:

```yaml
my-service:
  build:
    context: ./my-service
    dockerfile: Dockerfile
  # ... остальная конфигурация
```

## Поддержка

При возникновении проблем:

1. Проверьте логи: `make logs`
2. Проверьте статус: `make status`
3. Проверьте health check: `make health`
4. Очистите и пересоберите: `make clean && make build`
