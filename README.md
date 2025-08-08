# README.md

## Проект Telegram Support Bot для Rapira

### Содержание
1. Описание
2. Архитектура
3. Требования
4. Установка и запуск
5. Переменные окружения
6. Структура репозитория
7. Скрипты
8. Разработка
9. Agents

---

## 1. Описание
Проект реализует Telegram-бота для поддержки пользователей криптовалютной биржи Rapira с возможностью автоматических ответов через RAG + OpenAI и админ-панелью для операторов.

## 2. Архитектура
- Пакет support-gateway: Node.js, Fastify, Telegraf
- Пакет operator-admin: Next.js, Supabase UI
- Пакет worker: Node.js, BullMQ для фоновых задач (Whisper, ffmpeg)
- Supabase: Postgres с расширением pgvector, Storage, Realtime
- Redis: кэш и очередь задач

## 3. Требования
- Node.js версии не ниже 20
- Yarn или npm
- Аккаунты Telegram Bot API, Supabase, OpenAI API
- (Опционально) Docker для контейнеризации

## 4. Установка и запуск
1. Клонировать репозиторий:
   ```bash
   git clone <URL>
   cd <папка проекта>
   ```
2. Создать файл .env в корне и в каждом приложении apps/*:
   ```env
   BOT_TOKEN=
   SUPABASE_URL=
   SUPABASE_KEY=
   OPENAI_API_KEY=
   REDIS_URL=
   PORT=3000
   ```
3. Установить зависимости:
   ```bash
   yarn install
   ```
4. Запустить сервисы:
   ```bash
   yarn workspace support-gateway dev
   yarn workspace operator-admin dev
   yarn workspace worker dev
   ```

## 5. Переменные окружения
- BOT_TOKEN — токен Telegram бота
- SUPABASE_URL и SUPABASE_KEY — параметры доступа к Supabase
- OPENAI_API_KEY — ключ для API OpenAI
- REDIS_URL — адрес сервера Redis
- PORT — порт для Fastify сервера

## 6. Структура репозитория
```
/apps
  support-gateway
  operator-admin
  worker
/packages
  shared
  kb-tools
/infrastructure
  supabase.sql
  render.yaml
.env.example
README.md
```

## 7. Скрипты
- yarn dev — запускает все приложения в режиме разработки
- yarn workspace support-gateway dev — запуск gateway
- yarn workspace operator-admin dev — запуск админки
- yarn workspace worker dev — запуск воркера
- yarn workspace kb-tools index:kb — массовая индексация Markdown в pgvector

## 8. Разработка
Пишите код в соответствующих папках apps/* и используйте shared для общих модулей. Миграции размещены в infrastructure.

## 9. Agents
Файл agents.js в папке agents содержит готовые промты для Codex и определения ролей агентов:

- botAgent: промт для автоматических ответов через RAG
- indexAgent: промт для индексирования и разбиения контента
- operatorAgent: промты для помощи оператору при ручном ответе

Подробнее — в файле agents/agents.js

