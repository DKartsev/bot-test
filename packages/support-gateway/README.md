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

- `BOT_TOKEN` — токен Telegram-бота.
- `SUPABASE_URL` — URL проекта Supabase.
- `SUPABASE_KEY` — ключ Supabase.
- `OPENAI_API_KEY` — ключ доступа OpenAI для RAG-сервиса.
- `REDIS_URL` — строка подключения к Redis для BullMQ.
- `PORT` — порт HTTP-сервера.
