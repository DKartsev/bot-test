.PHONY: help build up down dev prod clean logs shell-backend shell-admin shell-postgres shell-redis

# Переменные
COMPOSE_FILE = docker-compose.yml
COMPOSE_OVERRIDE = docker-compose.override.yml
ENV_FILE = docker.env

help: ## Показать справку
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Собрать все образы
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) build

build-prod: ## Собрать production образы
	docker-compose -f $(COMPOSE_FILE) build --target production

up: ## Запустить все сервисы
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) up -d

up-prod: ## Запустить production сервисы
	docker-compose -f $(COMPOSE_FILE) --profile production up -d

down: ## Остановить все сервисы
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) down

down-prod: ## Остановить production сервисы
	docker-compose -f $(COMPOSE_FILE) --profile production down

dev: ## Запустить в режиме разработки
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) --profile dev up -d

prod: ## Запустить в production режиме
	docker-compose -f $(COMPOSE_FILE) --profile production up -d

clean: ## Очистить все контейнеры, образы и volumes
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) down -v --rmi all
	docker system prune -f

logs: ## Показать логи всех сервисов
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) logs -f

logs-backend: ## Показать логи backend
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) logs -f bot-backend

logs-admin: ## Показать логи admin панели
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) logs -f bot-admin

shell-backend: ## Войти в shell backend контейнера
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) exec bot-backend sh

shell-admin: ## Войти в shell admin контейнера
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) exec bot-admin sh

shell-postgres: ## Войти в shell PostgreSQL контейнера
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) exec postgres psql -U bot_user -d bot_support

shell-redis: ## Войти в shell Redis контейнера
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) exec redis redis-cli

restart: ## Перезапустить все сервисы
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) restart

restart-backend: ## Перезапустить backend
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) restart bot-backend

restart-admin: ## Перезапустить admin панель
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) restart bot-admin

status: ## Показать статус всех сервисов
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) ps

health: ## Проверить health check всех сервисов
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) exec bot-backend wget -q -O - http://localhost:3000/health || echo "Backend unhealthy"
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) exec bot-admin wget -q -O - http://localhost:3000/health || echo "Admin unhealthy"

# Команды для тестирования
test-docker: ## Протестировать Docker конфигурацию (Linux/Mac)
	@echo "Тестирование Docker конфигурации..."
	./scripts/test-docker.sh

test-docker-win: ## Протестировать Docker конфигурацию (Windows)
	@echo "Тестирование Docker конфигурации..."
	powershell -ExecutionPolicy Bypass -File scripts/test-docker.ps1

test-docker-auto: ## Протестировать Docker конфигурацию (автоопределение ОС)
	@echo "Тестирование Docker конфигурации..."
	@if [ "$(OS)" = "Windows_NT" ]; then \
		powershell -ExecutionPolicy Bypass -File scripts/test-docker.ps1; \
	else \
		./scripts/test-docker.sh; \
	fi

# Команды для синхронизации с VM
sync-vm: ## Синхронизировать код с VM (Linux/Mac)
	@echo "Синхронизация с VM..."
	./scripts/docker-sync.sh

sync-vm-win: ## Синхронизировать код с VM (Windows)
	@echo "Синхронизация с VM..."
	powershell -ExecutionPolicy Bypass -File scripts/docker-sync.ps1

sync-vm-auto: ## Синхронизировать код с VM (автоопределение ОС)
	@echo "Синхронизация с VM..."
	@if [ "$(OS)" = "Windows_NT" ]; then \
		powershell -ExecutionPolicy Bypass -File scripts/docker-sync.ps1; \
	else \
		./scripts/docker-sync.sh; \
	fi

# Команды для production
deploy: build-prod up-prod ## Развернуть в production
	@echo "Приложение развернуто в production режиме"

rollback: ## Откатить к предыдущей версии
	@echo "Откат к предыдущей версии..."
	git checkout HEAD~1
	$(MAKE) deploy
