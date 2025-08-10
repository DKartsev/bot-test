# support-gateway

Сервис-шлюз для Telegram поддержки.

## Запуск

1. Установите зависимости:
   ```bash
   npm install
   ```
2. Создайте файл `.env` и задайте переменные окружения.
3. Запустите в режиме разработки:
   ```bash
   npm run dev
   ```

## Переменные окружения

- `TG_BOT_TOKEN` — токен Telegram-бота.
- `TG_WEBHOOK_PATH` — путь вебхука, по умолчанию `/webhooks/telegram`.
- `TG_WEBHOOK_SECRET` — опциональный секрет для проверки вебхука.
- `ADMIN_IP_ALLOWLIST` — список разрешённых IP для доступа к админке.
- `ADMIN_TOKENS` — токены доступа к административному API.
- `SUPABASE_URL` — URL проекта Supabase.
- `SUPABASE_KEY` — ключ Supabase.
- `OPENAI_API_KEY` — ключ доступа OpenAI для RAG-сервиса.
- `REDIS_URL` — строка подключения к Redis для BullMQ.
- `PORT` — порт HTTP-сервера.
