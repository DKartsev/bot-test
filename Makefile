# Makefile для управления Docker контейнерами
# Использование: make <команда>

.PHONY: help build up down restart logs status clean prod-up prod-down

# Основные команды
help: ## Показать справку по командам
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Собрать все образы
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev build

up: ## Запустить все сервисы в режиме разработки
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev up -d

down: ## Остановить все сервисы
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev down

restart: ## Перезапустить все сервисы
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev restart

logs: ## Показать логи всех сервисов
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev logs -f

status: ## Показать статус всех сервисов
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev ps

clean: ## Очистить все контейнеры, образы и volumes
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev down -v
	docker system prune -f
	docker volume prune -f

# Production команды
prod-build: ## Собрать production образы
	docker-compose -f docker-compose.prod.yml build

prod-up: ## Запустить production сервисы
	docker-compose -f docker-compose.prod.yml up -d

prod-down: ## Остановить production сервисы
	docker-compose -f docker-compose.prod.yml down

prod-logs: ## Показать логи production сервисов
	docker-compose -f docker-compose.prod.yml logs -f

prod-status: ## Показать статус production сервисов
	docker-compose -f docker-compose.prod.yml ps

# Отдельные сервисы
backend-logs: ## Показать логи backend
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev logs -f bot-backend

admin-logs: ## Показать логи admin панели
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev logs -f bot-admin

worker-logs: ## Показать логи worker
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev logs -f worker

postgres-logs: ## Показать логи PostgreSQL
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev logs -f postgres

redis-logs: ## Показать логи Redis
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev logs -f redis

# Утилиты
shell-backend: ## Войти в shell backend контейнера
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev exec bot-backend sh

shell-admin: ## Войти в shell admin контейнера
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev exec bot-admin sh

shell-worker: ## Войти в shell worker контейнера
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev exec worker sh

shell-postgres: ## Войти в shell PostgreSQL контейнера
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev exec postgres psql -U bot_user -d bot_support

# Мониторинг
monitor: ## Показать использование ресурсов
	docker stats --no-stream

health: ## Проверить здоровье всех сервисов
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Бэкапы
backup-db: ## Создать бэкап базы данных
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev exec postgres pg_dump -U bot_user bot_support > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore-db: ## Восстановить базу данных из бэкапа (указать файл: make restore-db FILE=backup.sql)
	docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile dev exec -T postgres psql -U bot_user -d bot_support < $(FILE)

# Развертывание
deploy: prod-build prod-up ## Развернуть production версию
	@echo "Production развертывание завершено!"

rollback: prod-down ## Откатить production версию
	@echo "Production версия откачена!"
