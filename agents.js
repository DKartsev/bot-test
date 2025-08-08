/**
 * agents/agents.js
 * 
 * Готовые промты для Codex, используемые для автоматизации генерации кода
 * в монорепозитории Telegram Support Bot для Rapira.
 */

module.exports = {
  /**
   * Агент для генерации и доработки кода support-gateway:
   * Fastify + Telegraf, RAG-пайплайн, сохранение сообщений и хенд-офф.
   */
  botAgent: {
    name: 'botAgent',
    description: 'Генерировать поддержку поддержки Telegram-бота (support-gateway)',
    prompt: `
Ты — агент генерации кода для пакета support-gateway в проекте Telegram Support Bot Rapira.
Твоя задача — создать или доработать файлы: package.json, tsconfig.json, index.ts, setupSupabase.ts,
handlers для Telegraf и Fastify, RAG-логика с pgvector, функции getOrCreateConversation,
сохранение и извлечение сообщений, маршруты webhook Telegram и API для админ-панели.
Код должен быть на TypeScript, использовать zod для валидации, pino для логов.
Добавь обработку ошибок и конфигурацию через переменные окружения.
`  },

  /**
   * Агент для реализации KB-инструментов:
   * chunkMarkdown, indexKB, scripts/index-all.ts.
   */
  indexAgent: {
    name: 'indexAgent',
    description: 'Реализовать и документация для пакета kb-tools',
    prompt: `
Ты — агент для пакета kb-tools. Тебе нужно:
1) Написать функцию chunkMarkdown в utils.ts: разбивка Markdown на чанки по ~500 токенов.
2) Создать indexKB в index.ts: чтение чанков, генерация эмбеддингов через OpenAIEmbeddings
   и вставка в Supabase (таблица kb_chunks).
3) Создать скрипт scripts/index-all.ts для массовой индексации всех .md из папки kb_articles.
4) Обработать ошибки и логировать процесс.
`  },

  /**
   * Агент для начального скелета support-gateway:
   * структура папок, базовые конфиги, шаблоны.
   */
  scaffoldGatewayAgent: {
    name: 'scaffoldGatewayAgent',
    description: 'Скеболовая структура и конфигурация для support-gateway',
    prompt: `
Ты — агент для создания каркаса пакета support-gateway.
Cоздай:
- package.json с необходимыми зависимостями (fastify, telegraf, @supabase/supabase-js, dotenv, zod, pino).
- tsconfig.json для TypeScript.
- структура src/{bot.ts, server.ts, db.ts, handlers/*.ts, services/*.ts}.
- README.md внутри пакета с инструкцией запуска и переменными окружения.
`  },

  /**
   * Агент для начального скелета админ-панели operator-admin:
   * Next.js, Supabase Auth, базовые страницы.
   */
  scaffoldAdminAgent: {
    name: 'scaffoldAdminAgent',
    description: 'Скелет и базовые компоненты для operator-admin',
    prompt: `
Ты — агент для пакета operator-admin (Next.js + TypeScript).
Cоздай:
- next.config.js с настройками публичного пути и env.
- Страницу /login с Supabase Auth UIF.
- Страницу /conversations: список чатов, вызов API /conversations.
- Страницу /conversations/[id]: отображение сообщений, форма ответа.
- Компоненты UI с shadcn/ui: Card, Button, Input.
- Хуки для вызова API через fetch или SWR.
`  },

  /**
   * Агент для скелета воркера worker:
   * BullMQ, Redis, задачи ffmpeg и Whisper.
   */
  scaffoldWorkerAgent: {
    name: 'scaffoldWorkerAgent',
    description: 'Скелет и задачи для worker (BullMQ)',
    prompt: `
Ты — агент для пакета worker.
Cоздай:
- package.json с bullmq, ioredis, fluent-ffmpeg, @openai/whisper.
- Файл queue.ts: инициализация очередей для видео и аудио.
- Файл jobs/videoProcessor.ts: извлечение кадров через ffmpeg, вызов Vision API.
- Файл jobs/audioProcessor.ts: загрузка аудио, транскрипция через Whisper.
- Логи и обработка ошибок, ретраи в очередях.
`  },

  /**
   * Агент для генерации SQL-миграций Supabase
   */
  migrationAgent: {
    name: 'migrationAgent',
    description: 'Создание SQL-миграций для Supabase',
    prompt: `
Ты — агент для инфраструктурных миграций Supabase.
Сгенерируй файл 001_create_support_schema.sql с таблицами conversations, messages,
kb_articles, kb_chunks, assignments_log, включая расширение vector и необходимые индексы.
`  },

  /**
   * Агент для CI/CD и девопс конфигов
   */
  devopsAgent: {
    name: 'devopsAgent',
    description: 'Render и Docker конфигурации, CI/Scripts',
    prompt: `
Ты — агент DevOps.
Cоздай render.yaml для трёх сервисов: support-gateway, operator-admin, worker.
Добавь Dockerfile для каждого приложения и docker-compose.yml для локального старта.
Добавь GitHub Actions workflow, который запускает линтинг, сборку и тесты.
`  },

  /**
   * Агент для генерации и обновления README.md
   */
  readmeAgent: {
    name: 'readmeAgent',
    description: 'Генерация основного README.md проекта',
    prompt: `
Ты — агент документации.
Обнови README.md в корне репозитория:
- Опиши проект, архитектуру, установки, скрипты, env, структуру папок, примеры команд.
- Добавь разделы Codex Agents и Contacts.
`  },

  /**
   * Агент для создания тестов
   */
  testAgent: {
    name: 'testAgent',
    description: 'Сценарии тестирования для Jest/Playwright',
    prompt: `
Ты — агент тестирования.
Сгенерируй:
- Jest конфигурацию и примеры unit-тестов для функций chunkMarkdown и getOrCreateConversation.
- Playwright скрипты для e2e: проверка API /conversations, отправка webhook и ответ бота.
`  },

  /**
   * Агент для генерации .env.example
   */
  envAgent: {
    name: 'envAgent',
    description: 'Файл .env.example с описанием переменных окружения',
    prompt: `
Ты — агент переменных окружения.
Сгенерируй файл .env.example с комментариями для всех переменных:
BOT_TOKEN, SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY, REDIS_URL, PORT.
`  }
};
