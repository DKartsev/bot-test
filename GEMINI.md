# GEMINI.md — Правила проекта и контекст для ИИ-ассистента

> Пиши комментарии и объяснения **на русском**. Никогда **не** апрувь PR автоматически.

## 0) Цель
Сделать код и архитектуру бота для Telegram и бэкенда:
- безопасными (без утечек, с проверкой вебхуков, валидацией ввода, RLS в БД),
- поддерживаемыми (слои, типы, единые ошибки, тесты),
- наблюдаемыми (логи, метрики, трассировка),
- производительными (нет N+1, кэш там, где нужно),
- и удобными для CI/CD (Docker, Render, GitHub Actions).

---

## 1) Область проекта (repo scope)
Монорепо:
- `packages/backend` — HTTP/API слой (Fastify), Telegram webhook/команды (Telegraf), бизнес-логика.
- `packages/shared` — переиспользуемые типы/утилиты/DTO/константы.
- (опционально) `packages/admin` — админка/документация (Next.js).

Бот: Telegram (Telegraf), режим по умолчанию — **webhook**.

---

## 2) Архитектура (слои и зависимости)
Придерживаемся **Hexagonal/Onion**:
- **domain/** — сущности, value-objects, интерфейсы репозиториев, правила.
- **application/** — use-cases/interactors, без знание о внешнем мире; порт-ориентированные интерфейсы.
- **infrastructure/** — адаптеры: Supabase/PG, Redis, HTTP клиенты, Telegram adapters.
- **http/** — Fastify плагины/роуты, валидаторы, сериализаторы, OpenAPI.
- **bot/** — Telegraf сцены/команды/мидлвары (как адаптер к application).

Правила зависимостей:
- `http` и `bot` могут зависеть от `application` и `shared`.
- `application` зависит только от `domain` и `shared`.
- `infrastructure` реализует порты `domain/application`.
- Запрещены импорт-циклы и «стрельба» снизу вверх (lint на import-layers).

---

## 3) Язык и базовые стандарты кода
- **TypeScript strict**: `"strict": true`, `"noImplicitAny": true`, `"exactOptionalPropertyTypes": true`.
- Модули: ESM (или CJS единообразно). Путь: `@app/shared/*`, сборка через `tsc` + `tsc-alias`.
- Стиль: **ESLint** (Airbnb/standard + правила для import-layers), **Prettier**.
- Коммиты: **Conventional Commits** (`feat:`, `fix:`, `chore:`…), ветки: `feature/*`, `fix/*`.
- Никаких `any`, `// @ts-ignore` без issue-ссылки и обоснования.

---

## 4) HTTP API (Fastify)
- Версионирование путей: `/api/v1/...`. **Админ** только под `/api/admin/...` и защищён.
- Схемы запрос/ответ: **Zod**/**TypeBox** (строгая валидация на входе + сериализация ответа).
- Корзина middlewares:
  - `@fastify/helmet` (CSP по умолчанию, корректируй под webhook/Swagger),
  - `@fastify/rate-limit` (дефолт: 100 req/мин по IP),
  - `@fastify/cors` (точный allowlist, не `*`),
  - `pino-http` (requestId, userId, masked headers).
- **Единый формат ошибок**:
  ```json
  {
    "error": {
      "type": "validation|auth|not_found|conflict|rate_limited|internal|external",
      "message": "Короткое описание",
      "code": "APP_XXX",
      "details": {...},
      "requestId": "..."
    }
  }
Маппинг статусов:

400 — валидация, 401/403 — auth, 404 — not found, 409 — conflict,

429 — rate limit, 500 — internal, 502/503 — внешние API (Telegram/OpenAI/и т.д.).

OpenAPI: автогенерируй Swagger UI на /docs (защищён basic-auth в prod).

5) Telegram бот (Telegraf)
Безопасность webhooks:

Проверка подписи/секрет-токена в заголовках (или IP-allowlist Telegram).

Webhook путь: /webhooks/telegram/:botId, секрет из TELEGRAM_WEBHOOK_SECRET.

Запрет getUpdates в prod. Любые «off-platform» контакты — запрещены.

Структура:

bot/commands/ — отдельный файл на команду; описания и примеры.

bot/middlewares/ — аутентификация, локализация, логирование, анти-спам.

bot/scenes/ — пошаговые сценарии (wizard/base scenes), минимум сайд-эффектов.

bot/services/ — тонкие адаптеры к application-usecases.

i18n (ru→default, en→fallback); все строки — в locales/.

Best practices:

Любая внешняя операция (БД, HTTP) — через application usecase.

Контекст Telegraf типизирован; исключить ctx as any.

Анти-спам: rate limit по from.id, дебаунс повторных команд.

Логи команд: кто/когда/какой результат (без персональных данных в явном виде).

6) Данные и Supabase/Postgres
Работа с БД через infrastructure/db адаптер: репозитории + DTO из shared/.

Обязательно RLS (Row Level Security) для пользовательских таблиц.

Все запросы параметризованы; никаких string-concat SQL.

Индексы — на FK, уникальные ключи, частичные индексы под частые фильтры.

Транзакции: используем BEGIN…COMMIT в usecase при нескольких изменениях.

Миграции:

Только через официальные миграции Supabase/SQL-миграции в репо.

Нельзя CREATE INDEX CONCURRENTLY внутри транзакции — выноси отдельно.

Стратегия «zero-downtime»: добавление колонок → бэкоф → переключение → удаление старого.

PII: шифруй/маскируй в логах (телефон, email, токены).

Резервное копирование и TTL для логов: 30 дней по умолчанию.

7) Конфигурация и секреты
Переменные окружения (пример, не коммить реальные значения):

ini
Копировать
Редактировать
NODE_ENV=production
PORT=8080
APP_BASE_URL=https://<your-domain>
LOG_LEVEL=info

TELEGRAM_BOT_TOKEN=<secret>
TELEGRAM_WEBHOOK_SECRET=<secret> # сравнивай в мидлваре/хедере
TELEGRAM_ALLOWED_IPS=149.154.160.0/20,91.108.4.0/22

SUPABASE_URL=<https://*.supabase.co>
SUPABASE_SERVICE_ROLE_KEY=<secret> # хранить только на сервере
SUPABASE_ANON_KEY=<public>         # только для фронта, не для бэка

REDIS_URL=redis://...
RATE_LIMIT_PER_MINUTE=100
В Docker/Render секреты задаются через dashboard/Secrets.

Никогда не логируй значения токенов и ключей (маскируй).

8) Ошибки и ретраи внешних сервисов
Telegram/OpenAI/Supabase:

сеть/429 — экспоненциальный ретрай (max 3), джиттер.

таймауты: 5–10 cек (HTTP), 30 сек (долгие задачи через очередь).

В логах различай: validation_error (400) vs external_failure (502/503).

Все throw → через централизованный AppError с type, code, status.

9) Производительность
Избегай N+1: объединяй запросы, используй IN (...), индексы.

Кэш: короткий TTL в Redis для часто читаемых справочников (напр., настройки).

Потоки/очереди: длительные задачи (например, проверка ончейн) — через BullMQ/Redis.

JSON сериализация Fastify — с serializerOpts (fast-json-stringify).

10) Наблюдаемость
Логи: pino JSON; поля: time, level, msg, requestId, userId, path. Маскирование: Authorization, cookies, токены.

Метрики: Prometheus /metrics (защищён), ключевые: http_requests_total, http_request_duration_seconds, telegram_updates_total, bot_command_errors_total.

Трейсинг: OpenTelemetry (http client/server, pg, redis). Экспорт в OTLP/Tempo/Jaeger.

Алерты: 5xx > X% за N минут, рост 429, всплески bot_command_errors_total.

11) Тестирование
Unit: vitest/jest, покрытие сущностей/domain/usecases.

Integration: supertest + Testcontainers (Postgres/Redis) для роутов/репозиториев.

Bot tests: мок Telegraf (update objects), «золотые пути» команд/сцен, защита от спама.

E2E (опционально): Playwright для WebApp/админки.

Min покрытие: 80% по строкам в backend и 100% по критичным usecases.

Snapshot-тесты для ответов бота не должны содержать PII/токены.

12) CI/CD и Docker
Docker: multi-stage (builder → runner), NODE_ENV=production, npm ci --omit=dev.

Юзер контейнера — не root.

Health-роуты: HEAD/GET / → 200 OK.

Не запускать husky в CI/production (скрипт prepare — только в dev).

В GitHub Actions:

Линт + типы + тесты + build на каждый PR.

PR-ревью через google-github-actions/run-gemini-cli без авто-аппрува.

Деплой по main с ручным подтверждением (environments + required reviewers).

13) Документация
README в packages/backend с:

«как запустить локально», .env.example, миграции, Swagger, метрики.

Документ MIGRATION_GUIDE.md (как безопасно мигрировать БД, индексы, бэкофы).

ADR (Architecture Decision Records) для ключевых решений.

14) Политики безопасности
Webhook Telegram — только POST, с верификацией X-Telegram-Bot-Api-Secret-Token (или проверка IP) и rate-limit.

/api/admin — только с токеном/ролью, никогда не выставлять публично.

Маскирование персональных данных в логах; PII хранить минимально и по TTL.

CORS — только доверенные origins.

Обновлять зависимости с известными уязвимостями (Dependabot/npm audit PR).

15) Локализация
Пользовательские тексты — через i18n (ru → по умолчанию, en → fallback).

Никаких захардкоженных строк в коде бота.

16) Гайд для PR-ревью (что проверять ассистенту)
Соблюдение слоёв и импорт-границ; нет «утечек» infra в domain/application.

Типы строгие, без any; валидация входа/выхода через схемы.

Единый формат ошибок; корректный HTTP-код.

Безопасность:

нет логирования секретов,

есть защита webhook,

RLS/права БД не нарушены.

Производительность: индексы, отсутствие N+1, кэш уместен.

Тесты и покрытие, зелёный CI.

Документация/миграции обновлены, если требуется.

Соответствие GEMINI.md и код-стайлу; комментарии — на русском.

Не апрувить PR автоматически; в конце дать чек-лист «что поправить».

17) Гайд для триажа Issues
Сводка на 3–6 пунктов.

Severity: P0 (прод упал/безопасность), P1, P2, P3.

Метки:

area:backend, area:shared, area:bot,

type:bug, type:feature, type:enhancement, needs:repro, security.

Дубликаты — сослаться, закрыть/связать.

Если не хватает воспроизведения: запросить шаги/логи/версию/скрины.

18) Маршрутизация и правила каталогов
В packages/backend/src/:

domain/, application/, infrastructure/ (db, redis, http-clients),

http/ (plugins, routes, schemas),

bot/ (commands, middlewares, scenes, services),

config/ (загрузка env, Zod-валидация),

logger/, errors/, utils/.

В packages/shared/src/: types/, dto/, constants/, validation/.

19) Известные грабли/ограничения
Husky в проде ломает сборку (Render/CI) — не вызывать prepare на сервере.

CREATE INDEX CONCURRENTLY — вне транзакции.

Никогда не хранить SUPABASE_SERVICE_ROLE_KEY на клиенте/в WebApp.

Любые новые эндпоинты → обновить OpenAPI и README.

20) Пример use-case скелета
ts
Копировать
Редактировать
// application/usecases/RegisterUser.ts
export interface RegisterUserPort {
  findByTelegramId(id: number): Promise<User | null>;
  createUser(input: CreateUserDTO): Promise<User>;
}

export class RegisterUser {
  constructor(private readonly port: RegisterUserPort) {}
  async execute(input: CreateUserDTO) {
    // доменные проверки...
    const existing = await this.port.findByTelegramId(input.telegramId);
    if (existing) return existing;
    return this.port.createUser(input);
  }
}
21) Фразы для ответа ассистента (PR/Issue)
«Здесь отсутствует валидация входных данных — добавь Zod-схему и верни 400 при ошибках.»

«В этом роуте неверно проставлен код ошибки; внешний сбой Telegram должен быть 502/503, а не 400.»

«Есть риск N+1 в репозитории; объедини запросы или добавь индекс на поля X/Y.»

«Webhook Telegram не проверяет секрет — добавь middleware проверки X-Telegram-Bot-Api-Secret-Token.»

«В логах печатается часть токена — замаскируй через redact в pino.»

22) Definition of Done (каждый PR)
 Линт/типы/тесты зелёные.

 Есть тесты на новую логику.

 Обновлены миграции/доки/ENV-пример.

 Пройдены пункты безопасности и производительности из этого файла.

 Комментарии и публичные тексты на русском.

Приложение A — Валидация окружения (env)
ts
Копировать
Редактировать
// packages/backend/src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().regex(/^\d+$/).default('8080').transform(Number),

  LOG_LEVEL: z.enum(['debug','info','warn','error']).default('info'),

  TELEGRAM_BOT_TOKEN: z.string().min(10),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),
  TELEGRAM_ALLOWED_IPS: z.string().optional(), // "149.154.160.0/20,91.108.4.0/22"

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10), // хранить только на бэке

  REDIS_URL: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);
Агент: если нет строгой схемы/env-проверки — создай её.

Приложение B — Безопасность Telegram webhook
ts
Копировать
Редактировать
// packages/backend/src/http/plugins/telegram-webhook-guard.ts
import fp from 'fastify-plugin';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { Netmask } from 'netmask';

const ranges = (env.TELEGRAM_ALLOWED_IPS ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)
  .map(cidr => new Netmask(cidr));

function ipAllowed(ip?: string) {
  if (!ip || ranges.length === 0) return true; // если не задано — пропускаем
  return ranges.some(r => r.contains(ip));
}

export default fp(async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    if (!req.routerPath?.startsWith('/webhooks/telegram')) return;

    // 1) секрет-токен
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw new AppError('auth','WEBHOOK_BAD_SIGNATURE','Invalid webhook secret',401);
    }

    // 2) (опц.) allowlist по IP
    const ip = req.ip;
    if (!ipAllowed(ip)) {
      throw new AppError('auth','WEBHOOK_IP_NOT_ALLOWED','IP not allowed',403,{ ip });
    }
  });
});
Агент: если в проекте webhook не защищён секретом/allowlist — добавь этот плагин и тесты к нему.

Приложение C — Единый класс ошибок и error-handler
ts
Копировать
Редактировать
// packages/backend/src/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly type:
      'validation'|'auth'|'not_found'|'conflict'|'rate_limited'|'external'|'internal',
    public readonly code: string,
    message: string,
    public status = 500,
    public readonly details?: Record<string, unknown>
  ) { super(message); this.name = 'AppError'; }
}
ts
Копировать
Редактировать
// packages/backend/src/http/error-handler.ts
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export function registerErrorHandler(app: import('fastify').FastifyInstance) {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: { type: 'validation', code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.issues, requestId: req.id }
      });
    }

    const e = err instanceof AppError ? err : new AppError('internal','UNEXPECTED', err.message ?? 'Internal error', 500);
    // внешние API должны быть 502/503
    if (e.type === 'external' && e.status < 500) e.status = 502;

    reply.code(e.status).send({
      error: { type: e.type, code: e.code, message: e.message, details: e.details, requestId: req.id }
    });
  });
}
Агент: привести все throw/return ошибок к этому формату; валидацию входа — через Zod/TypeBox.

Приложение D — Логирование и маскирование (pino)
ts
Копировать
Редактировать
// packages/backend/src/logger/index.ts
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: undefined,
  redact: { // ничего секретного в логах
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers.set-cookie',
      'body.token',
      'config.headers.Authorization',
      'config.headers.authorization'
    ],
    remove: true,
  },
});
ts
Копировать
Редактировать
// регистрация pino-http
import pinoHttp from 'pino-http';
import { nanoid } from 'nanoid';

app.register(pinoHttp, {
  logger,
  genReqId: (req) => req.headers['x-request-id'] as string || nanoid(),
  customSuccessMessage: ()=>'ok',
});
Агент: убедись, что логи структурированы, есть requestId, секреты редактируются.

Приложение E — Наблюдаемость (OpenTelemetry + /metrics)
ts
Копировать
Редактировать
// packages/backend/src/otel.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
export const otel = new NodeSDK({
  traceExporter: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })
    : undefined,
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': { enabled: true },
    '@opentelemetry/instrumentation-fastify': { enabled: true },
    '@opentelemetry/instrumentation-pg': { enabled: true },
    '@opentelemetry/instrumentation-redis-4': { enabled: true },
  })],
});
ts
Копировать
Редактировать
// packages/backend/src/http/routes/metrics.ts
import fp from 'fastify-plugin';
import client from 'prom-client';
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export default fp(async (app) => {
  app.get('/metrics', { config: { isInternal: true } }, async (_, reply) => {
    reply.header('Content-Type', registry.contentType);
    return await registry.metrics();
  });
});
Агент: добавить простые метрики (http_requests_total, telegram_updates_total, ошибки бота).

Приложение F — Supabase/PG: RLS и доступ
Если фронт не ходит прямо в Supabase:
— включи RLS, но все запросы идут через backend с Service Role (ключ хранится только на сервере).
— anon-ключ фронту не выдаём.

Если появится прямой доступ с фронта (через anon): примеры политик:

sql
Копировать
Редактировать
alter table user_progress enable row level security;

create policy "select own progress"
on user_progress for select
to authenticated
using ( user_id = auth.uid() );

create policy "insert own progress"
on user_progress for insert
to authenticated
with check ( user_id = auth.uid() );
Агент: проверить индексы на FK/фильтры, параметризацию запросов, отсутствие N+1.

Приложение G — CI: quality gates (линт, типы, тесты, покрытие)
.github/workflows/ci.yml

yaml
Копировать
Редактировать
name: CI
on:
  pull_request:
    paths:
      - 'packages/backend/**'
      - 'packages/shared/**'
  push:
    branches: [main]
permissions: read-all

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test --workspaces --if-present -- --coverage
      - name: Enforce coverage
        run: |
          THRESHOLD=80
          ACTUAL=$(node -e "console.log(require('./coverage/coverage-summary.json').total.statements.pct)")
          echo "Coverage: $ACTUAL"
          if [ $(printf "%.0f" "$ACTUAL") -lt $THRESHOLD ]; then
            echo "Coverage below ${THRESHOLD}%"; exit 1; fi
Агент: если нет линта/типов/покрытия — добавь. Ошибки 5xx/тесты обязаны «красить» PR.

Приложение H — Безопасность (чек-лист)
Webhook Telegram: секрет-токен/allowlist IP + rate limit.

Никаких секретов в логах/исключениях.

CORS — только доверенные origins.

Dependabot/обновления уязвимых пакетов; npm audit в CI (warning ≠ fail, critical → fail).

Эндпойнты /api/admin/** — закрыты ролью/токеном; Swagger закрыт basic-auth в проде.

Любые внешние API: таймауты + экспоненциальный ретрай (max 3) + классификация ошибок external.

Бэкапы БД; TTL логов ≥30 дней.

Приложение I — Производительность и защитa от DoS
@fastify/rate-limit: минимум 100 req/мин на IP для публичных роутов; отдельный лимит для webhook бота.

Кэш в Redis для часто читаемых справочников (TTL 30–300 сек).

Очереди (BullMQ) для долгих задач; не держать «тяжёлую» работу в HTTP/вебхуке.

Профилирование подозрительных запросов; избегать N+1, добавлять индексы.

Приложение J — Процедура миграций (zero-downtime)
Подготовка: добавить новые nullable-колонки/таблицы.

Деплой кода, который умеет работать и со старым, и с новым форматом.

Бэкфилл данных миграционным скриптом.

Переключение чтения/записи на новые поля.

Очистка устаревших колонок (отдельная миграция).

CREATE INDEX CONCURRENTLY — вне транзакции.

Приложение K — Дизайн команд бота
Обязательные: /start, /help, /settings, /cancel.

Все команды — идемпотентны и быстры; долгие операции — «принято, ждите», дальше уведомление.

Сцены: минимум сайд-эффектов, валидация каждого шага, таймауты на ожидание ввода.

Локализация из locales/, никаких захардкоженных строк в коде.

Приложение L — Подсказка для Gemini при ревью (скопируй в prompt workflow’а)
diff
Копировать
Редактировать
Проверь PR по чек-листу GEMINI.md и Приложений A–K:
- архитектурные слои (hexagonal), отсутствие циклов импортов,
- валидация входа/выхода, единый формат ошибок, корректные HTTP-коды,
- безопасность вебхука Telegram и админ-эндпойнтов, маскирование логов,
- производительность (индексы, отсутствие N+1, кэш), ретраи внешних API,
- наблюдаемость (логи, /metrics, OTEL), тесты и покрытие,
- миграции БД согласно runbook.

Дай чёткие diff-ориентированные предложения: что добавить/исправить и почему.
Ответ — на русском. Не апрувь PR автоматически.
