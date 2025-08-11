import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// -------------------------------
// Env helpers (без внешних зависимостей)
// -------------------------------
function getEnv() {
  const {
    NODE_ENV = 'development',
    PORT = '3000',
    LOG_LEVEL = 'info',
    ADMIN_TOKEN,
    CORS_ORIGIN = '', // пусто -> авто
    RATE_LIMIT_MAX = '200',
    ENABLE_DOCS = '0',
    TG_WEBHOOK_SECRET = '', // если задан, проверяем X-Telegram-Bot-Api-Secret-Token
    TG_WEBHOOK_PATH = '/webhooks/telegram',
    TRUST_PROXY = '',
  } = process.env;

  if (!ADMIN_TOKEN) {
    // Не падаем в проде, но логируем громко — иначе всё /api/admin будет 401
    // Вы можете сделать throw new Error('ADMIN_TOKEN is required') для строгого прод-харда.
    console.warn('[WARN] ADMIN_TOKEN is not set. /api/admin* will be inaccessible (401).');
  }

  return {
    NODE_ENV,
    PORT: Number(PORT) || 3000,
    LOG_LEVEL,
    ADMIN_TOKEN,
    CORS_ORIGIN,
    RATE_LIMIT_MAX: Number(RATE_LIMIT_MAX) || 200,
    ENABLE_DOCS: ENABLE_DOCS === '1',
    TG_WEBHOOK_SECRET,
    TG_WEBHOOK_PATH,
    TRUST_PROXY: TRUST_PROXY ? TRUST_PROXY === '1' : NODE_ENV === 'production',
  } as const;
}

const env = getEnv();

// -------------------------------
// Server factory
// -------------------------------
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    trustProxy: env.TRUST_PROXY,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // оставим false, если отдаёте Swagger UI; включите при необходимости
  });

  // CORS: по умолчанию — авто: dev: true, prod: из CORS_ORIGIN
  const corsOrigin = ((): boolean | string | RegExp | (string | RegExp)[] => {
    if (env.NODE_ENV !== 'production') return true;
    if (!env.CORS_ORIGIN) return false; // в проде по умолч. запрещаем
    if (env.CORS_ORIGIN.includes(',')) return env.CORS_ORIGIN.split(',').map((s) => s.trim());
    return env.CORS_ORIGIN;
  })();
  await app.register(cors, { origin: corsOrigin, credentials: false });

  // Rate limiting
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req.headers['x-forwarded-for'] as string) || req.ip,
    ban: 0,
    allowList: [],
  });

  // OpenAPI + UI (опционально или под админ-токеном)
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'bot-test Backend API',
        description: 'Health, admin-only endpoints, secured webhooks',
        version: '1.0.0',
      },
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
        },
      },
    },
  });

  if (env.ENABLE_DOCS) {
    await app.register(swaggerUi, {
      routePrefix: '/docs',
    });
  }

  // -------------------------------
  // Хелперы
  // -------------------------------
  const adminAuthHook = async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : (req.headers['x-admin-token'] as string | undefined);

    if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  };

  // Унифицированный ответ об ошибках
  app.setErrorHandler((err, _req, reply) => {
    // Валидационные ошибки Fastify
    // @ts-ignore — у fastify есть признак validation, но типы не универсальны
    if (err.validation) {
      return reply.code(400).send({ error: 'Bad Request', details: err.message });
    }

    const status = (err as any).statusCode || (err as any).status || 500;

    // Маппинг сетевых/внешних сбоев
    const externalLike = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
    if (externalLike.includes((err as any).code)) {
      return reply.code(502).send({ error: 'Bad Gateway', details: err.message });
    }

    // 5xx по умолчанию
    const code = status >= 400 && status < 600 ? status : 500;
    reply.code(code).send({ error: code >= 500 ? 'Internal Server Error' : 'Error', details: err.message });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: 'Not Found', path: req.url });
  });

  // -------------------------------
  // Health endpoints (HEAD/GET "/" и GET "/api/health")
  // -------------------------------
  app.route({
    method: 'HEAD',
    url: '/',
    handler: async (_req, reply) => {
      reply.code(200).send();
    },
    schema: {
      summary: 'Health (HEAD)',
      tags: ['health'],
    },
  });

  app.route({
    method: 'GET',
    url: '/',
    handler: async (_req, reply) => {
      reply.send({ status: 'ok', service: 'bot-test-backend', timestamp: new Date().toISOString(), uptime: process.uptime() });
    },
    schema: {
      summary: 'Health (root)',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            service: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
  });

  app.route({
    method: 'GET',
    url: '/api/health',
    handler: async (_req, reply) => {
      reply.send({ status: 'ok' });
    },
    schema: {
      summary: 'Health (API)',
      tags: ['health'],
      response: { 200: { type: 'object', properties: { status: { type: 'string' } } } },
    },
  });

  // -------------------------------
  // ADMIN: переносим /api/message → /api/admin/message, только с токеном
  // -------------------------------
  app.route<{ Body: { text: string } }>({
    method: 'POST',
    url: '/api/admin/message',
    preHandler: adminAuthHook,
    handler: async (req, reply) => {
      const { text } = req.body || ({} as any);
      if (!text || typeof text !== 'string') {
        return reply.code(400).send({ error: 'Bad Request', details: 'Field "text" is required' });
      }

      // TODO: Вызов сервиса LLM / бизнес-логики. Здесь только заглушка.
      return reply.send({ ok: true, echo: text });
    },
    schema: {
      summary: 'Admin: message (secured)',
      tags: ['admin'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
      	required: ['text'],
        properties: { text: { type: 'string' } },
      },
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' }, echo: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
        400: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'string' } } },
      },
    },
  });

  // -------------------------------
  // Безопасный Telegram webhook
  // Требуем заголовок X-Telegram-Bot-Api-Secret-Token === TG_WEBHOOK_SECRET (как рекомендует Telegram)
  // и/или секрет в пути (например, /webhooks/telegram/:token)
  // -------------------------------
  app.route({
    method: 'POST',
    url: `${env.TG_WEBHOOK_PATH}/:token?`,
    handler: async (req: FastifyRequest<{ Params: { token?: string } }>, reply) => {
      // 1) По заголовку
      const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
      const headerOk = env.TG_WEBHOOK_SECRET && headerSecret === env.TG_WEBHOOK_SECRET;

      // 2) По параметру пути
      const pathOk = env.TG_WEBHOOK_SECRET && req.params?.token === env.TG_WEBHOOK_SECRET;

      if (!env.TG_WEBHOOK_SECRET || (!headerOk && !pathOk)) {
        req.log.warn({ ip: req.ip }, 'Unauthorized Telegram webhook access');
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Здесь вызовите ваш Telegram-обработчик
      // await telegramBot.handleUpdate(req.body)

      return reply.send({ ok: true });
    },
    schema: {
      summary: 'Telegram webhook (secured)',
      tags: ['webhooks'],
      response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } },
    },
  });

  return app;
}

// -------------------------------
// Bootstrap
// -------------------------------
async function start() {
  const app = await buildServer();

  const close = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down');
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => close('SIGINT'));
  process.on('SIGTERM', () => close('SIGTERM'));

  try {
    await app.ready();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info({ url: `http://0.0.0.0:${env.PORT}` }, 'Server started');
  } catch (err) {
    app.log.error({ err }, 'Failed to start');
    process.exit(1);
  }
}

if (require.main === module) {
  // Запускаем только если файл выполнен напрямую
  // (даёт возможность импортировать buildServer() в тестах)
  start();
}
