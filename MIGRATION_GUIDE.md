# Руководство по миграции на Docker

## Обзор

Этот документ описывает процесс миграции существующего проекта Bot Support System на Docker контейнеризацию.

## Преимущества миграции

1. **Идентичность окружения** - локально = продакшен
2. **Упрощение развертывания** - один образ для всех сред
3. **Изоляция зависимостей** - нет конфликтов версий
4. **Масштабируемость** - легко добавлять новые инстансы
5. **Воспроизводимость** - гарантированная работоспособность

## Этапы миграции

### Этап 1: Подготовка

1. **Установка Docker**
   ```bash
   # Windows
   # Скачайте Docker Desktop с официального сайта
   
   # Linux
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # macOS
   brew install --cask docker
   ```

2. **Проверка установки**
   ```bash
   docker --version
   docker-compose --version
   ```

### Этап 2: Анализ существующего проекта

1. **Зависимости**
   - Проверьте `package.json` на наличие всех необходимых пакетов
   - Убедитесь, что версии совместимы

2. **Переменные окружения**
   - Создайте список всех используемых переменных
   - Определите, какие нужны для разработки, какие для продакшена

3. **Конфигурация базы данных**
   - Проверьте схему базы данных
   - Создайте скрипты инициализации

### Этап 3: Создание Docker конфигурации

1. **Dockerfile.backend**
   - Многоэтапная сборка (development + production)
   - Оптимизация размера образа
   - Безопасность (непривилегированный пользователь)

2. **docker-compose.yml**
   - Все необходимые сервисы
   - Сети и volumes
   - Health checks
   - Переменные окружения

3. **docker-compose.override.yml**
   - Настройки для разработки
   - Монтирование исходного кода
   - Hot reload

### Этап 4: Тестирование

1. **Локальная разработка**
   ```bash
   make dev
   # Проверьте работу всех сервисов
   ```

2. **Production режим**
   ```bash
   make prod
   # Проверьте оптимизацию и безопасность
   ```

3. **Интеграционные тесты**
   - API endpoints
   - База данных
   - Redis
   - Nginx

### Этап 5: Развертывание на VM

1. **Подготовка VM**
   ```bash
   ssh -l dankartsev 84.201.146.125
   
   # Установка Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Установка Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Клонирование проекта**
   ```bash
   git clone <your-repo-url>
   cd <project-name>
   ```

3. **Настройка переменных окружения**
   ```bash
   cp docker.env .env
   # Отредактируйте .env с реальными значениями
   ```

4. **Развертывание**
   ```bash
   make build-prod
   make up-prod
   ```

## Частые проблемы и решения

### Проблема: Контейнер не запускается

**Решение:**
```bash
# Проверьте логи
make logs

# Проверьте статус
make status

# Проверьте health check
make health
```

### Проблема: Не подключается к базе данных

**Решение:**
```bash
# Проверьте статус PostgreSQL
docker-compose ps postgres

# Проверьте логи PostgreSQL
docker-compose logs postgres

# Подключитесь к базе
make shell-postgres
```

### Проблема: Проблемы с правами доступа

**Решение:**
```bash
# Проверьте права на volumes
ls -la logs/ data/

# Исправьте права
sudo chown -R $USER:$USER logs/ data/
```

### Проблема: Медленная сборка

**Решение:**
```bash
# Очистите кэш
make clean

# Используйте BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Пересоберите
make build
```

## Проверочный список

- [ ] Docker установлен и работает
- [ ] Все сервисы запускаются локально
- [ ] Переменные окружения настроены
- [ ] База данных инициализируется корректно
- [ ] API endpoints отвечают
- [ ] Health checks проходят
- [ ] Логи корректно записываются
- [ ] Проект развернут на VM
- [ ] Все тесты проходят
- [ ] Документация обновлена

## Откат изменений

Если что-то пошло не так:

1. **Локально**
   ```bash
   make down
   make clean
   # Вернитесь к предыдущей версии
   ```

2. **На VM**
   ```bash
   # Подключитесь к VM
   ssh -l dankartsev 84.201.146.125
   
   # Остановите Docker
   docker-compose down
   
   # Вернитесь к предыдущей версии
   git checkout HEAD~1
   ```

## Следующие шаги

После успешной миграции:

1. **CI/CD Pipeline**
   - Автоматическая сборка образов
   - Автоматическое тестирование
   - Автоматическое развертывание

2. **Мониторинг**
   - Prometheus + Grafana
   - Логирование в ELK stack
   - Алерты

3. **Масштабирование**
   - Docker Swarm или Kubernetes
   - Load balancing
   - Auto-scaling

## Поддержка

При возникновении проблем:

1. Проверьте логи: `make logs`
2. Проверьте статус: `make status`
3. Проверьте health check: `make health`
4. Обратитесь к документации: `DOCKER_README.md`
5. Создайте issue в репозитории
