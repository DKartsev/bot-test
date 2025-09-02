
# Инструкция по развертыванию на VM (158.160.169.147)

## Шаг 1: Подключение к VM

Подключитесь к VM через SSH:
```bash
ssh root@158.160.169.147
```

## Шаг 2: Переход в директорию проекта

```bash
cd /root/bot-test
```

## Шаг 3: Получение последних изменений

```bash
git pull origin main
```

## Шаг 4: Создание файла docker.env

Создайте файл `docker.env` на основе шаблона и добавьте реальные значения:

```bash
cp docker.env.example docker.env
nano docker.env
```

Обновите следующие значения в `docker.env`:

```env
# Database (Supabase) - используйте значения из локального .env
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
DATABASE_URL=<your-database-url>

# OpenAI - используйте значения из локального .env
OPENAI_API_KEY=<your-openai-api-key>

# Telegram - используйте значения из локального .env
TG_BOT_TOKEN=<your-telegram-bot-token>
```

## Шаг 5: Проверка .env файла

Убедитесь, что основной `.env` файл также содержит все необходимые переменные:

```bash
nano .env
```

Проверьте наличие этих переменных (используйте реальные значения из локального .env):
```env
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
TG_BOT_TOKEN=<your-telegram-bot-token>
```

## Шаг 6: Остановка контейнеров

```bash
docker-compose down
```

## Шаг 7: Пересборка и запуск контейнеров

```bash
docker-compose up --build -d
```

## Шаг 8: Проверка статуса контейнеров

```bash
docker-compose ps
```

## Шаг 9: Просмотр логов

```bash
# Логи backend
docker-compose logs -f bot-backend

# Логи admin
docker-compose logs -f bot-admin
```

## Шаг 10: Тестирование RAG API

После запуска контейнеров протестируйте RAG API:

```bash
# Health check
curl http://158.160.169.147:3000/api/supabase-rag/health

# Info endpoint
curl http://158.160.169.147:3000/api/supabase-rag/info

# Test endpoint
curl -X POST http://158.160.169.147:3000/api/supabase-rag/test \
  -H "Content-Type: application/json" \
  -d '{"testQuery": "Как пополнить баланс?"}'
```

## Troubleshooting

### Если контейнеры не запускаются:

1. Проверьте логи:
```bash
docker-compose logs
```

2. Проверьте, что все переменные окружения настроены:
```bash
cat docker.env
cat .env
```

3. Пересоберите контейнеры с очисткой кэша:
```bash
docker-compose down
docker system prune -f
docker-compose up --build -d
```

### Если RAG API не отвечает:

1. Проверьте, что SQL функция создана в Supabase:
   - Выполните скрипт `packages/backend/scripts/setup-supabase-rag.sql` в Supabase SQL Editor

2. Проверьте, что есть данные в таблице `kb_chunks`:
   - В Supabase Dashboard проверьте таблицу `kb_chunks`

3. Проверьте логи backend контейнера:
```bash
docker-compose logs -f bot-backend
```

## Полезные команды

```bash
# Перезапуск только backend
docker-compose restart bot-backend

# Просмотр использования ресурсов
docker stats

# Очистка неиспользуемых образов
docker image prune -f

# Подключение к контейнеру для отладки
docker-compose exec bot-backend bash
```
