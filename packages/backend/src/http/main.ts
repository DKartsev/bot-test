import Fastify, {
  FastifyReply,
  FastifyRequest,
  FastifyTypeProviderDefault,
  FastifyBaseLogger,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
} from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import crypto from "node:crypto";

import { buildContext, answer, invalidateCache } from "../bot/pipeline.js";
import { loadFaq } from "../faq/store.js";
import { reindexKb } from "../kb/index.js";

/* global fetch */

// ---------------------------------
// Env helpers
// ---------------------------------
function getEnv() {
  const {
    NODE_ENV = "development",
    PORT = "3000",
    LOG_LEVEL = "info",

    // Admin auth (CSV of tokens)
    ADMIN_API_TOKENS = "",

    // CORS / Docs / RateLimit
    CORS_ORIGIN = "",
    ENABLE_DOCS = "0",
    RATE_LIMIT_MAX = "200",

    // Telegram webhook
    TELEGRAM_BOT_TOKEN = "",
    TG_WEBHOOK_PATH = "/webhooks/telegram",
    TG_WEBHOOK_SECRET = "",
    PUBLIC_URL = "",
    TELEGRAM_SET_WEBHOOK_ON_START = "0",

    TRUST_PROXY = "",
  } = process.env;

  const adminTokens = ADMIN_API_TOKENS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!adminTokens.length) {
    console.warn("[WARN] ADMIN_API_TOKENS is empty. /api/admin* will be 401.");
  }

  return {
    NODE_ENV,
    PORT: Number(PORT) || 3000,
    LOG_LEVEL,
    ADMIN_API_TOKENS: adminTokens,
    CORS_ORIGIN,
    ENABLE_DOCS: ENABLE_DOCS === "1",
    RATE_LIMIT_MAX: Number(RATE_LIMIT_MAX) || 200,
    TELEGRAM_BOT_TOKEN,
    TG_WEBHOOK_PATH,
    TG_WEBHOOK_SECRET,
    PUBLIC_URL,
    TELEGRAM_SET_WEBHOOK_ON_START: TELEGRAM_SET_WEBHOOK_ON_START === "1",
    TRUST_PROXY: TRUST_PROXY ? TRUST_PROXY === "1" : NODE_ENV === "production",
  } as const;
}

const env = getEnv();

// ---------------------------------
// Error classifier
// ---------------------------------
function classifyError(err: any) {
  // fastify validation
  if (err && (err.validation || err.validationContext)) {
    return {
      status: 400,
      body: { error: "Bad Request", details: err.message },
    };
  }

  // external/network
  const externalLike = ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"];
  if (externalLike.includes(err?.code)) {
    return {
      status: 502,
      body: { error: "Bad Gateway", details: err.message },
    };
  }

  // axios/fetch style
  const httpStatus = err?.response?.status ?? err?.statusCode;
  if (typeof httpStatus === "number") {
    if (httpStatus === 429)
      return {
        status: 503,
        body: {
          error: "Service Unavailable",
          details: "Upstream rate-limited",
        },
      };
    if (httpStatus >= 500)
      return {
        status: 502,
        body: { error: "Bad Gateway", details: "Upstream error" },
      };
    if (httpStatus >= 400)
      return {
        status: httpStatus,
        body: { error: "Error", details: err.message },
      };
  }

  return {
    status: 500,
    body: {
      error: "Internal Server Error",
      details: err?.message || "unknown error",
    },
  };
}

// ---------------------------------
// Server factory
// ---------------------------------
export async function buildServer() {
  const app = Fastify<
    RawServerDefault,
    RawRequestDefaultExpression<RawServerDefault>,
    RawReplyDefaultExpression<RawServerDefault>,
    FastifyBaseLogger,
    FastifyTypeProviderDefault
  >({ logger: { level: env.LOG_LEVEL }, trustProxy: env.TRUST_PROXY });

  app.addHook("onRequest", (req, reply, done) => {
    let rid = req.headers["x-request-id"] as string | undefined;
    if (!rid) rid = crypto.randomUUID();
    (req as any).rid = rid;
    reply.header("x-request-id", rid);
    // @ts-ignore
    req.log = req.log.child({ rid });
    done();
  });

  // Security headers
  await app.register(helmet as any, { contentSecurityPolicy: false });

  // CORS: dev=true; prod=off unless CORS_ORIGIN set
  const corsOrigin = ((): boolean | string | RegExp | (string | RegExp)[] => {
    if (env.NODE_ENV !== "production") return true;
    if (!env.CORS_ORIGIN) return false;
    if (env.CORS_ORIGIN.includes(","))
      return env.CORS_ORIGIN.split(",").map((s) => s.trim());
    return env.CORS_ORIGIN;
  })();
  await app.register(cors as any, { origin: corsOrigin, credentials: false });

  // Rate limit
  await app.register(rateLimit as any, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    keyGenerator: (req: FastifyRequest) =>
      (req.headers["x-forwarded-for"] as string) || req.ip,
  });

  // OpenAPI
  await app.register(swagger as any, {
    openapi: {
      info: {
        title: "bot-test Backend API",
        description: "Health, admin-only endpoints, secured webhooks",
        version: "1.1.0",
      },
      servers: [{ url: "/" }],
      components: {
        securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
      },
    },
  });
  if (env.ENABLE_DOCS) {
    await app.register(swaggerUi as any, { routePrefix: "/docs" });
  }

  // -------------------------------
  // Helpers
  // -------------------------------
  const adminAuthHook = async (req: FastifyRequest, reply: FastifyReply) => {
    const header = (req.headers["authorization"] as string) || "";
    const bearer = header.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : undefined;
    const alt = req.headers["x-admin-token"] as string | undefined;
    const token = bearer || alt;

    if (!token || !env.ADMIN_API_TOKENS.includes(token)) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  };

  app.setErrorHandler((err, req, reply) => {
    const { status, body } = classifyError(err);
    const rid = (req as any).rid;
    reply.code(status).send({ ...body, rid });
  });

  app.setNotFoundHandler((req, reply) =>
    reply.code(404).send({ error: "Not Found", path: req.url }),
  );

  // -------------------------------
  // Health
  // -------------------------------
  app.route({
    method: "HEAD",
    url: "/",
    handler: async (_req, reply) => reply.code(200).send(),
    schema: { summary: "Health (HEAD)", tags: ["health"] } as any,
  });

  app.route({
    method: "GET",
    url: "/",
    handler: async (_req, reply) => {
      reply.send({
        status: "ok",
        service: "bot-test-backend",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    },
    schema: {
      summary: "Health (root)",
      tags: ["health"],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            service: { type: "string" },
            timestamp: { type: "string" },
            uptime: { type: "number" },
          },
        },
      },
    } as any,
  });

  app.route({
    method: "GET",
    url: "/api/health",
    handler: async (_req, reply) => reply.send({ status: "ok" }),
    schema: {
      summary: "Health (API)",
      tags: ["health"],
      response: {
        200: { type: "object", properties: { status: { type: "string" } } },
      },
    } as any,
  });

  // -------------------------------
  // Admin: /api/admin/message
  // -------------------------------
  app.route<{ Body: { text: string } }>({
    method: "POST",
    url: "/api/admin/message",
    preHandler: adminAuthHook,
    handler: async (req, reply) => {
      const { text } = req.body || ({} as any);
      if (!text || typeof text !== "string") {
        return reply
          .code(400)
          .send({ error: "Bad Request", details: 'Field "text" is required' });
      }
      // TODO: replace with LLM/business logic
      return reply.send({ ok: true, echo: text });
    },
    schema: {
      summary: "Admin: message (secured)",
      tags: ["admin"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["text"],
        properties: { text: { type: "string" } },
      },
      response: {
        200: {
          type: "object",
          properties: { ok: { type: "boolean" }, echo: { type: "string" } },
        },
        400: {
          type: "object",
          properties: {
            error: { type: "string" },
            details: { type: "string" },
          },
        },
        401: { type: "object", properties: { error: { type: "string" } } },
      },
    } as any,
  });

  app.get(
    "/api/admin/faq",
    {
      preHandler: adminAuthHook,
      schema: {
        summary: "Admin: FAQ list",
        tags: ["admin"],
        security: [{ bearerAuth: [] }],
      } as any,
    },
    async (_req, reply) => {
      reply.send(loadFaq());
    },
  );

  app.post(
    "/api/admin/faq/validate",
    {
      preHandler: adminAuthHook,
      schema: {
        summary: "Admin: FAQ validate",
        tags: ["admin"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              errors: { type: "array", items: { type: "string" } },
              count: { type: "number" },
            },
          },
        },
      } as any,
    },
    async (_req, reply) => {
      const faq = loadFaq();
      const ids = new Set<string>();
      const errors: string[] = [];
      for (const f of faq) {
        if (!f.id || !f.q || !f.a) errors.push(`Invalid: ${f.id}`);
        if (ids.has(f.id)) errors.push(`Duplicate: ${f.id}`);
        ids.add(f.id);
      }
      invalidateCache();
      reply.send({ ok: errors.length === 0, errors, count: faq.length });
    },
  );

  app.post(
    "/api/admin/kb/reindex",
    {
      preHandler: adminAuthHook,
      schema: {
        summary: "Admin: KB reindex",
        tags: ["admin"],
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: "object", properties: { ok: { type: "boolean" } } },
        },
      } as any,
    },
    async (_req, reply) => {
      reindexKb();
      invalidateCache();
      reply.send({ ok: true });
    },
  );

  // -------------------------------
  // Telegram: bot + secure webhook
  // -------------------------------
  let bot: Telegraf | null = null;
  if (env.TELEGRAM_BOT_TOKEN) {
    bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

    // Simple handlers for smoke test
    bot.start((ctx: Context) => ctx.reply("👋 Hello! Bot is alive."));
    bot.on(message("text"), async (ctx) => {
      await ctx.sendChatAction("typing");
      await ctx.reply("⌛ Обрабатываю запрос...");
      const res = await answer(ctx.message.text, {
        rid: (ctx.state as any).rid,
        logger: (ctx.state as any).logger || app.log,
      });
      await ctx.reply(res.text);
    });

    // Secure webhook route
    app.route({
      method: "POST",
      url: `${env.TG_WEBHOOK_PATH}/:token?`,
      handler: async (
        req: FastifyRequest<{ Params: { token?: string } }>,
        reply,
      ) => {
        const headerSecret = req.headers["x-telegram-bot-api-secret-token"];
        const headerOk =
          env.TG_WEBHOOK_SECRET && headerSecret === env.TG_WEBHOOK_SECRET;
        const pathOk =
          env.TG_WEBHOOK_SECRET && req.params?.token === env.TG_WEBHOOK_SECRET;

        if (!env.TG_WEBHOOK_SECRET || (!headerOk && !pathOk)) {
          req.log.warn({ ip: req.ip }, "Unauthorized Telegram webhook access");
          return reply.code(401).send({ error: "Unauthorized" });
        }

        try {
          // Call bot directly (avoids strict path binding of webhookCallback)
          // @ts-ignore update is any
          await bot!.handleUpdate((req as any).body, undefined, {
            state: { rid: (req as any).rid, logger: req.log },
          });
          return reply.send({ ok: true });
        } catch (err: any) {
          const { status, body } = classifyError(err);
          return reply.code(status).send(body);
        }
      },
      schema: {
        summary: "Telegram webhook (secured)",
        tags: ["webhooks"],
        response: {
          200: { type: "object", properties: { ok: { type: "boolean" } } },
          401: { type: "object", properties: { error: { type: "string" } } },
        },
      } as any,
    });

    // Optional: set webhook on start
    if (
      env.TELEGRAM_SET_WEBHOOK_ON_START &&
      env.PUBLIC_URL &&
      env.TG_WEBHOOK_SECRET
    ) {
      const webhookUrl = `${env.PUBLIC_URL}${env.TG_WEBHOOK_PATH}/${env.TG_WEBHOOK_SECRET}`;
      try {
        const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`;
        const res = await fetch(tgUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: env.TG_WEBHOOK_SECRET,
          }),
        } as any);
        const json = await res.json();
        if (!(json as any).ok) {
          app.log.warn({ json }, "Telegram setWebhook returned not ok");
        } else {
          app.log.info({ webhookUrl }, "Telegram webhook set");
        }
      } catch (err) {
        app.log.warn({ err }, "Failed to set Telegram webhook on start");
      }
    }
  } else {
    app.log.warn("TELEGRAM_BOT_TOKEN is not set. Telegram bot disabled.");
  }

  // expose a simple info endpoint about webhook (no secrets)
  app.get("/api/telegram/info", async (_req, reply) => {
    reply.send({
      enabled: Boolean(env.TELEGRAM_BOT_TOKEN),
      path: env.TG_WEBHOOK_PATH,
      hasSecret: Boolean(env.TG_WEBHOOK_SECRET),
    });
  });

  await buildContext();
  return app;
}

// ---------------------------------
// Bootstrap
// ---------------------------------
import { fileURLToPath } from "node:url";

async function start() {
  const app = await buildServer();

  const close = async (signal: string) => {
    app.log.info({ signal }, "Shutting down");
    try {
      // stop telegraf gracefully if present
      try {
        const anyApp = app as any;
        if (anyApp?.bot && typeof anyApp.bot.stop === "function") {
          await anyApp.bot.stop(signal);
        }
      } catch {}
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => close("SIGINT"));
  process.on("SIGTERM", () => close("SIGTERM"));

  try {
    await app.ready();
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info({ url: `http://0.0.0.0:${env.PORT}` }, "Server started");
  } catch (err) {
    (app.log as any).error({ err }, "Failed to start");
    process.exit(1);
  }
}

// ESM‑safe "entrypoint" check
const isMain = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return (
      typeof process !== "undefined" &&
      process.argv &&
      thisFile === process.argv[1]
    );
  } catch {
    return false;
  }
})();

if (isMain) start();
