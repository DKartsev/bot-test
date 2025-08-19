import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { type Update } from 'telegraf/types';
import { logger } from '../utils/logger.js';
import pgPlugin from '../plugins/pg.js';
import { ragAnswer } from '../app/pipeline/ragAnswer.js';

// Локальные роуты/плагины (NodeNext/ESM → указываем .js)
import routes from './routes/index.js';
import adminTelegram from './routes/admin/telegram.js';
import adminConversations from './routes/admin/conversations.js';
import adminMetrics from './routes/admin/metrics.js';
import adminFAQ from './routes/admin/faq.js';
import adminUsers from './routes/admin/users.js';
import adminCategories from './routes/admin/categories.js';
import adminNotes from './routes/admin/notes.js';
import adminStream from './routes/admin/stream.js';
import adminPlugin from './plugins/admin.js';

/**
 * Создание Fastify-приложения.
 * Health-роуты: GET/HEAD "/"
 * Telegram webhook: POST ${TG_WEBHOOK_PATH}/:token?  (секрет в заголовке x-telegram-bot-api-secret-token ИЛИ в :token)
 * Дополнительно: логирование входящих апдейтов и отлов ошибок Telegraf.
 */
export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    trustProxy: true,
  });

  await app.register(rateLimit, { global: false });
  await app.register(pgPlugin);
  await app.register(multipart);

  // -------- Health --------
  app.head('/', (_req: unknown, reply: { code: (s: number) => { send: () => void } }) => reply.code(200).send());
  app.get('/', () => ({
    status: 'ok',
    service: 'bot-test-backend',
    time: new Date().toISOString(),
  }));

  // -------- Health Check для интеграции --------
  app.get('/health', async (_request: unknown, reply: { code: (s: number) => { send: (body: unknown) => void } }) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {} as Record<string, string>,
    };

    // Check database connection
    if (app.pg) {
      try {
        await app.pg.query('SELECT 1');
        health.checks.database = 'ok';
      } catch (err) {
        health.checks.database = 'error';
        health.status = 'error';
      }
    } else {
      health.checks.database = 'skipped';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    return reply.code(statusCode).send(health);
  });

  // -------- Регистрация внутренних роутов --------
  await app.register(routes);
  await app.register(adminPlugin, { prefix: '/api' });
  await app.register(adminTelegram);
  await app.register(adminConversations);
  await app.register(adminMetrics);
  await app.register(adminFAQ);
  await app.register(adminUsers);
  await app.register(adminCategories);
  await app.register(adminNotes);
  await app.register(adminStream);

  // -------- CORS настройки для operator-admin --------
  void app.addHook('onRequest', async (request: { method: string }, reply: { header: (k: string, v: string) => void; send: () => void }) => {
    // Разрешаем запросы от operator-admin
    reply.header('Access-Control-Allow-Origin', 'https://bot-test-operator-admin.onrender.com');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      return reply.send();
    }
  });

  app.log.info('🚀 Backend API готов к интеграции с панелью операторов');

  // -------- Telegram / Webhook --------
  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TG_PATH = process.env.TG_WEBHOOK_PATH || '/webhooks/telegram';
  const TG_SECRET = process.env.TG_WEBHOOK_SECRET || '';

  if (!TG_TOKEN) {
    app.log.warn(
      '⚠️ TELEGRAM_BOT_TOKEN не установлен — маршрут Telegram webhook НЕ будет зарегистрирован',
    );
    return app;
  }

  const bot = new Telegraf(TG_TOKEN);

  void bot.catch((err: unknown, ctx: { chat?: { id?: number | string }; updateType?: string }) => {
    app.log.error(
      { err, tg_chat_id: ctx.chat?.id, tg_type: ctx.updateType },
      '❌ Ошибка в Telegram боте',
    );
  });

  void bot.on('message', async (ctx: { chat?: { id?: number | string }; updateType?: string }, next: () => Promise<void>) => {
    try {
      app.log.info(
        { tg_chat_id: ctx.chat?.id, tg_type: ctx.updateType },
        '📨 Получено сообщение от пользователя',
      );
    } catch {
      // ignore
    }
    return next();
  });

  void bot.on(message('text'), async (ctx: { message: { text?: string }; sendChatAction: (action: string) => Promise<void>; reply: (text: string) => Promise<void> }) => {
    const text = ctx.message.text || '';
    try {
      await ctx.sendChatAction('typing');
    } catch {
      // ignore
    }
    try {
      // Вызываем ragAnswer для получения ответа
      const result = await ragAnswer({
        text,
        lang: 'ru',
        logger: app.log,
        pg: app.pg,
      });

      const answer = result.answer;
      const escalate = result.escalate;
      const tail = escalate
        ? '\n\nЕсли нужно — могу подключить оператора поддержки.'
        : '';

      await ctx.reply(`${answer}${tail}`);
    } catch (err) {
      app.log.error({ err }, '❌ Ошибка обработки сообщения через ragAnswer');
      try {
        await ctx.reply(
          '❌ Ошибка обработки. Могу подключить оператора поддержки.',
        );
      } catch {
        // ignore
      }
    }
  });

  interface TelegramWebhookParams {
    token?: string;
  }

  void app.post(`${TG_PATH}/:token?`, async (req: { headers: Record<string, string | undefined>; params: { token?: string }; body: unknown; ip: string }, reply: { code: (status: number) => { send: () => void } }) => {
    const headerSecret = String(
      req.headers['x-telegram-bot-api-secret-token'] || '',
    );
    const urlSecret = req.params?.token || '';
    const hasSecret = Boolean(TG_SECRET);

    if (hasSecret) {
      if (headerSecret !== TG_SECRET && urlSecret !== TG_SECRET) {
        app.log.warn({ ip: req.ip }, '🚫 Неавторизованный доступ к Telegram webhook');
        return reply.code(401).send();
      }
    } else {
      app.log.warn(
        { ip: req.ip },
        '🚫 Telegram webhook заблокирован: отсутствует TG_WEBHOOK_SECRET',
      );
      return reply.code(401).send();
    }

    try {
      // @ts-expect-error: handleUpdate exists at runtime; shim types may not include it
      await bot.handleUpdate(req.body as Update);
      return reply.code(200).send();
    } catch (err) {
      app.log.error({ err }, '❌ Ошибка обработки Telegram обновления');
      return reply.code(500).send();
    }
  });

  return app;
}

async function start() {
  const app = await createApp();
  const port = Number(process.env.PORT || 3000);
  const host = '0.0.0.0';
  try {
    await app.listen({ port, host });
    app.log.info({ port }, '🚀 Сервер успешно запущен');
  } catch (err) {
    app.log.error({ err }, '❌ Не удалось запустить сервер');
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  void start().catch((err) => {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  });
}

export default createApp;
