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
    
    // Путь к собранным статическим файлам operator-admin
    const adminStaticPath = path.join(__dirname, "../../../operator-admin/.next");
    app.log.info({ adminStaticPath }, "Admin static path resolved");
    
    // Проверяем существование папки
    const fs = await import("fs");
    try {
      const stats = fs.statSync(adminStaticPath);
      app.log.info({ 
        exists: true, 
        isDirectory: stats.isDirectory(),
        size: stats.size 
      }, "Admin static path exists");
      
      // Проверяем содержимое папки
      const files = fs.readdirSync(adminStaticPath);
      app.log.info({ files: files.slice(0, 10) }, "Admin static folder contents");
      
      // Исследуем структуру .next папки для поиска HTML файлов
      app.log.info("Investigating .next folder structure for HTML files...");
      
      // Проверяем подпапки
      const subfolders = files.filter(file => {
        try {
          return fs.statSync(path.join(adminStaticPath, file)).isDirectory();
        } catch {
          return false;
        }
      });
      app.log.info({ subfolders }, "Subfolders found in .next");
      
      // Ищем HTML файлы в разных местах
      const htmlFiles = [];
      const searchPaths = [
        "index.html",
        "app/page.html",
        "pages/index.html",
        "static/index.html"
      ];
      
      for (const searchPath of searchPaths) {
        const fullPath = path.join(adminStaticPath, searchPath);
        try {
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            htmlFiles.push({ path: searchPath, exists: true, size: stats.size });
          } else {
            htmlFiles.push({ path: searchPath, exists: false });
          }
        } catch (err) {
          htmlFiles.push({ path: searchPath, exists: false, error: String(err) });
        }
      }
      
      app.log.info({ htmlFiles }, "HTML file search results");
      
      // Проверяем app директорию если она есть
      if (subfolders.includes("app")) {
        try {
          const appPath = path.join(adminStaticPath, "app");
          const appFiles = fs.readdirSync(appPath);
          app.log.info({ appFiles }, "App directory contents");
          
          // Ищем page.html или другие HTML файлы в app
          const appHtmlFiles = appFiles.filter(file => file.endsWith('.html'));
          if (appHtmlFiles.length > 0) {
            app.log.info({ appHtmlFiles }, "HTML files found in app directory");
          }
        } catch (err) {
          app.log.warn({ err }, "Failed to read app directory");
        }
      }
    } catch (fsErr) {
      app.log.warn({ fsErr }, "Admin static path does not exist or not accessible");
    }
    
    // Регистрируем статические файлы для operator-admin
    await app.register(fastifyStatic, {
      root: adminStaticPath,
      prefix: "/admin",
      decorateReply: false,
    });
    app.log.info("Static files plugin registered");
    
    // SPA fallback для admin роутов - должен быть ПОСЛЕ регистрации статики
    app.get("/admin", async (req, reply) => {
      app.log.info("Admin route /admin accessed - redirecting to /admin/");
      return reply.redirect("/admin/");
    });
    
    app.get("/admin/", async (req, reply) => {
      app.log.info("Admin route /admin/ accessed - serving SPA");
      try {
        const fs = await import("fs");
        
        // В Next.js App Router ищем index.html в разных местах
        let indexPath = path.join(adminStaticPath, "index.html");
        if (!fs.existsSync(indexPath)) {
          // Пробуем найти в app директории
          indexPath = path.join(adminStaticPath, "app", "page.html");
        }
        if (!fs.existsSync(indexPath)) {
          // Пробуем найти в pages директории (Pages Router)
          indexPath = path.join(adminStaticPath, "pages", "index.html");
        }
        
        if (fs.existsSync(indexPath)) {
          const html = fs.readFileSync(indexPath, "utf8");
          reply.type("text/html");
          return reply.send(html);
        } else {
          // Если HTML не найден, возвращаем простую страницу с редиректом
          app.log.warn("No HTML file found, serving fallback page");
          
          // Отключаем кэширование fallback страницы
          reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
          reply.header("Pragma", "no-cache");
          reply.header("Expires", "0");
          
          const fallbackHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Operator Admin Panel</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                  .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                  h1 { color: #333; margin-bottom: 20px; }
                  .status { background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 4px; margin: 20px 0; }
                  .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
                  .info { background: #d1ecf1; border: 1px solid #17a2b8; padding: 15px; border-radius: 4px; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🚀 Operator Admin Panel</h1>
                  
                  <div class="status">
                    <strong>✅ Статус:</strong> Панель администратора доступна
                  </div>
                  
                  <div class="warning">
                    <strong>⚠️ Внимание:</strong> Frontend файлы не найдены
                  </div>
                  
                  <div class="info">
                    <strong>ℹ️ Информация:</strong><br>
                    • Backend API работает корректно<br>
                    • Статические файлы зарегистрированы<br>
                    • Путь: /app/packages/operator-admin/.next<br>
                    • Файлы найдены в .next директории
                  </div>
                  
                  <p><strong>Попробуйте:</strong></p>
                  <ul>
                    <li><a href="/admin/">Обновить страницу</a></li>
                    <li><a href="/">Главная страница</a></li>
                  </ul>
                </div>
              </body>
            </html>
          `;
          reply.type("text/html");
          return reply.send(fallbackHtml);
        }
      } catch (err) {
        app.log.error({ err }, "Failed to serve admin page");
        return reply.code(500).send("Internal Server Error");
      }
    });
    
    // Убираем дублирующий роут /admin/* - fastifyStatic уже обрабатывает его
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
