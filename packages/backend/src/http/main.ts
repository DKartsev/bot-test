import Fastify, {
  type FastifyInstance,
} from "fastify";
import rateLimit from "@fastify/rate-limit";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { type Update } from "telegraf/types";
import pgPlugin from "../plugins/pg.js";
import { ragAnswer } from "../app/pipeline/ragAnswer.js";
import path from "path";
import { fileURLToPath } from "url";
import fastifyStatic from "@fastify/static";

// Локальные роуты/плагины (NodeNext/ESM → указываем .js)
import routes from "./routes/index.js";
import adminTelegram from "./routes/admin/telegram.js";

// Получаем путь к директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  await app.register(pgPlugin);

  // -------- Health --------
  app.head("/", (_req, reply) => reply.code(200).send());
  app.get("/", () => ({
    status: "ok",
    service: "bot-test-backend",
    time: new Date().toISOString(),
  }));

  // -------- Регистрация внутренних роутов --------
  await app.register(routes);
  await app.register(adminTelegram);

  // -------- Operator Admin Panel (Static Files) --------
  // Обслуживаем статические файлы operator-admin
  try {
    app.log.info("Starting operator admin panel setup...");
    
    // Путь к собранным статическим файлам operator-admin (скопированным в backend)
    const adminStaticPath = path.join(__dirname, "../.next");
    app.log.info({ adminStaticPath }, "Admin static path resolved");
    
    // Регистрируем статические файлы для operator-admin
    await app.register(fastifyStatic, {
      root: adminStaticPath,
      prefix: "/admin",
      decorateReply: false,
    });
    app.log.info("Static files plugin registered");
    
    // SPA fallback для admin роутов (должен быть после регистрации статики)
    app.get("/admin", async (req, reply) => {
      app.log.info("Admin route /admin accessed");
      return reply.send({ 
        status: "ok", 
        message: "Operator admin panel is available",
        note: "Static files registered, check /admin/ for frontend"
      });
    });
    
    app.get("/admin/", async (req, reply) => {
      app.log.info("Admin route /admin/ accessed");
      return reply.send({ 
        status: "ok", 
        message: "Operator admin panel is available",
        note: "Static files registered, frontend should load automatically"
      });
    });
    
    app.log.info("Operator admin panel static files registered successfully");
  } catch (err) {
    app.log.error({ err }, "Failed to register operator admin panel static files");
  }

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
    app.log.error(
      { err, tg_chat_id: ctx.chat?.id, tg_type: ctx.updateType },
      "Telegraf error",
    );
  });

  bot.on("message", async (ctx, next) => {
    try {
      app.log.info(
        { tg_chat_id: ctx.chat?.id, tg_type: ctx.updateType },
        "tg update received",
      );
    } catch {
      // ignore
    }
    return next();
  });

  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text || "";
    try {
      await ctx.sendChatAction("typing");
    } catch {
      // ignore
    }
    try {
      // Вызываем ragAnswer для получения ответа
      const result = await ragAnswer({
        text,
        lang: "ru",
        logger: app.log,
        pg: app.pg,
      });

      const answer = result.answer;
      const escalate = result.escalate;
      const tail = escalate
        ? "\n\nЕсли нужно — могу подключить оператора поддержки."
        : "";
      
      await ctx.reply(`${answer}${tail}`);
    } catch (err) {
      app.log.error({ err }, "ragAnswer/reply failed");
      try {
        await ctx.reply(
          "❌ Ошибка обработки. Могу подключить оператора поддержки.",
        );
      } catch {
        // ignore
      }
    }
  });

  interface TelegramWebhookParams {
    token?: string;
  }

  app.post(`${TG_PATH}/:token?`, async (req, reply) => {
    const headerSecret = String(
      req.headers["x-telegram-bot-api-secret-token"] || "",
    );
    const urlSecret = (req.params as TelegramWebhookParams)?.token || "";
    const hasSecret = Boolean(TG_SECRET);

    if (hasSecret) {
      if (headerSecret !== TG_SECRET && urlSecret !== TG_SECRET) {
        app.log.warn({ ip: req.ip }, "Unauthorized Telegram webhook access");
        return reply.code(401).send();
      }
    } else {
      app.log.warn(
        { ip: req.ip },
        "Telegram webhook blocked: missing TG_WEBHOOK_SECRET",
      );
      return reply.code(401).send();
    }

    try {
      await bot.handleUpdate(req.body as Update);
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
  void start();
}

export default createApp;
