import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import pgPlugin from "../plugins/pg.js";
import { ragAnswer } from "../app/pipeline/ragAnswer.js";

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
    },
    trustProxy: true,
  });

  await app.register(rateLimit as any, { global: false });
  await app.register(pgPlugin as any);

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
    app.log.warn(
      "TELEGRAM_BOT_TOKEN is not set — Telegram webhook route will NOT be registered",
    );
    return app;
  }

  const bot = new Telegraf(TG_TOKEN);

  bot.catch((err, ctx) => {
    app.log.error({ err, update: ctx.update }, "Telegraf error");
  });

  bot.on("message", async (ctx, next) => {
    try {
      const chat = (ctx.message as any)?.chat;
      app.log.info(
        {
          tg_chat_id: chat?.id,
          tg_type: (ctx.message as any)?.type || "message",
        },
        "tg update received",
      );
    } catch {}
    return next();
  });

  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text || "";
    try {
      await ctx.sendChatAction("typing");
    } catch {}
    try {
      const res = await ragAnswer({
        text,
        lang: "ru",
        logger: app.log,
        pg: app.pg,
      });
      const tail = res.escalate
        ? "\n\nЕсли нужно — могу подключить оператора поддержки."
        : "";
      await ctx.reply(`${res.answer}${tail}`);
    } catch (err) {
      app.log.error({ err }, "ragAnswer/reply failed");
      try {
        await ctx.reply(
          "❌ Ошибка обработки. Могу подключить оператора поддержки.",
        );
      } catch {}
    }
  });

  app.post(`${TG_PATH}/:token?`, async (req, reply) => {
    const headerSecret = String(
      req.headers["x-telegram-bot-api-secret-token"] || "",
    );
    const urlSecret = (req.params as any)?.token || "";
    const hasSecret = Boolean(TG_SECRET);

    if (hasSecret) {
      if (headerSecret !== TG_SECRET && urlSecret !== TG_SECRET) {
        app.log.warn(
          { ip: (req as any).ip },
          "Unauthorized Telegram webhook access",
        );
        return reply.code(401).send();
      }
    } else {
      app.log.warn(
        { ip: (req as any).ip },
        "Telegram webhook blocked: missing TG_WEBHOOK_SECRET",
      );
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
  start();
}

export default createApp;
