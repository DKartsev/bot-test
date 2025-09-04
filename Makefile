# Makefile для управления Docker контейнерами

.PHONY: help dev prod build clean logs restart test

# Показать справку
help:
	@echo "Доступные команды:"
	@echo "  dev       - Запустить в development режиме с hot reload"
	@echo "  prod      - Запустить в production режиме"
	@echo "  build     - Пересобрать контейнеры"
	@echo "  clean     - Остановить и удалить контейнеры"
	@echo "  logs      - Показать логи backend контейнера"
	@echo "  restart   - Перезапустить backend контейнер"
	@echo "  test      - Протестировать бота"

# Development режим (по умолчанию)
dev:
	docker-compose up -d

# Production режим
prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Пересобрать контейнеры
build:
	docker-compose build --no-cache

# Остановить и удалить контейнеры
clean:
	docker-compose down -v
	docker system prune -f

# Показать логи
logs:
	docker-compose logs -f bot-backend

# Перезапустить backend
restart:
	docker-compose restart bot-backend

# Протестировать бота
test:
	node restart-vm.cjs