import Fastify, { type FastifyInstance } from "fastify";
import { Telegraf, message } from "telegraf";

// Локальные роуты/плагины (NodeNext/ESM → указываем .js)
import routes from "./routes/index.js";
import adminTelegram from "./routes/admin/telegram.js";

/**
 * Создание Fastify-приложения.
 * Health-роуты: GET/HEAD "/"
 * Telegram webhook: POST ${TG_WEBHOOK_PATH}/:token?  (секрет в заголовке x-telegram-bot-api-secret-token ИЛИ в :token)
 * Дополнительно: логирование входящих апдейтов и отлов ошибок Telegraf.
 */
export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      // requestId включён по умолчанию; Fastify проставляет req.id (видно в логах)
    },
    trustProxy: true,
  });

  // -------- Health --------
  app.head("/", async (_req, reply) => reply.code(200).send());
  app.get("/", async () => ({
    status: "ok",
    service: "bot-test-backend",
    time: new Date().toISOString(),
  }));

  // -------- Регистрация внутренних роутов --------
  await app.register(routes);
  await app.register(adminTelegram);

  // -------- Telegram / Webhook --------
  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TG_PATH = process.env.TG_WEBHOOK_PATH || "/webhooks/telegram";
  const TG_SECRET = process.env.TG_WEBHOOK_SECRET || "";

  if (!TG_TOKEN) {
    app.log.warn("TELEGRAM_BOT_TOKEN is not set — Telegram webhook route will NOT be registered");
    return app;
  }

  const bot = new Telegraf(TG_TOKEN);

  // Логирование/отлов ошибок Telegraf
  bot.catch((err, ctx) => {
    app.log.error({ err, update: ctx.update }, "Telegraf error");
  });

  bot.on("message", async (ctx, next) => {
    try {
      const chat = (ctx.message as any)?.chat;
      app.log.info(
        { tg_chat_id: chat?.id, tg_type: (ctx.message as any)?.type || "message" },
        "tg update received"
      );
    } catch { }
    return next();
  });

  // Базовый обработчик текстов (минимальный фолбэк — чтобы было видно ответ бота)
  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text || "";
    try {
      await ctx.sendChatAction("typing");
    } catch (err) {
      app.log.warn({ err }, "sendChatAction failed");
    }

    try {
      // TODO: здесь можно вызвать ваш пайплайн (faq/kb + /api/bot/refine)
      await ctx.reply(`Принял: ${text}\n(демо-ответ: подключим RAG/перефразирование позже)`);
    } catch (err) {
      app.log.error({ err }, "reply failed");
      try {
        await ctx.reply("❌ Ошибка обработки. Могу подключить оператора поддержки.");
      } catch { }
    }
  });

  // Вебхук с секретом: разрешаем только при валидном секрете (заголовок ИЛИ :token)
  app.post(`${TG_PATH}/:token?`, async (req, reply) => {
    const headerSecret = String(req.headers["x-telegram-bot-api-secret-token"] || "");
    const urlSecret = (req.params as any)?.token || "";
    const hasSecret = Boolean(TG_SECRET);

    if (hasSecret) {
      if (headerSecret !== TG_SECRET && urlSecret !== TG_SECRET) {
        app.log.warn({ ip: (req as any).ip }, "Unauthorized Telegram webhook access");
        return reply.code(401).send();
      }
    } else {
      // Без секрета вебхук не обслуживаем — безопасный дефолт.
      app.log.warn({ ip: (req as any).ip }, "Telegram webhook blocked: missing TG_WEBHOOK_SECRET");
      return reply.code(401).send();
    }

    try {
      await bot.handleUpdate(req.body as any);
      return reply.send();
    } catch (err) {
      app.log.error({ err }, "bot.handleUpdate failed");
      return reply.code(500).send();
    }
  });

  return app;
}

// -------- Запуск сервера (кроме тестового окружения) --------
async function start() {
  const app = await createApp();
  const port = Number(process.env.PORT || 3000);
  const host = "0.0.0.0";
  try {
    await app.listen({ port, host });
    app.log.info({ port }, "server started");
  } catch (err) {
    app.log.error({ err }, "failed to start");
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  // В production/dev — стартуем сразу
  // В test — экспортируем только createApp()
  start();
}

export default createApp;
