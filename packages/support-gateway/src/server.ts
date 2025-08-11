import Fastify from "fastify";
import { z } from "zod";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import path from "path";
import fetch from "node-fetch";
import logger from "./utils/logger";
import { makeBot } from "./telegram/bot";
import adminRoutes from "./routes/admin.conversations";
import adminCategoriesRoutes from "./routes/admin.categories";
import adminStreamRoutes from "./routes/admin.stream";
import adminNotesRoutes from "./routes/admin.notes";
import adminSavedRepliesRoutes from "./routes/admin.saved-replies";
import adminCasesRoutes from "./routes/admin.cases";
import adminAskBotRoutes from "./routes/admin.ask-bot";
import adminMessageRoutes from "./http/plugins/adminMessage";
import adminGuard from "./http/middlewares/adminGuard";
import { classifyError } from "./utils/errorMap";
import {
  TG_WEBHOOK_PATH,
  TG_WEBHOOK_SECRET,
  ADMIN_IP_ALLOWLIST,
  ADMIN_RATE_LIMIT_MAX,
  TG_BOT_TOKEN,
  PUBLIC_URL,
  TELEGRAM_SET_WEBHOOK_ON_START,
  ADMIN_API_TOKENS,
} from "./config/env";

const envSchema = z.object({
  PORT: z.string().transform(Number).default("3000"),
});

const allow = ADMIN_IP_ALLOWLIST;

function ipToInt(ip: string) {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function matchIp(ip: string, rule: string) {
  if (rule.includes("/")) {
    const [range, bits] = rule.split("/");
    const mask = -1 << (32 - Number(bits));
    return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
  }
  return ip === rule;
}

function ipAllowlistMiddleware(req: any, reply: any, done: () => void) {
  if (!allow.length) {
    reply.status(403).send({ error: "Forbidden" });
    return;
  }
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
  const ok = allow.some((rule) => matchIp(ip, rule));
  if (!ok) {
    reply.status(403).send({ error: "Forbidden" });
    return;
  }
  done();
}

export async function buildServer() {
  const server = Fastify({ logger: logger as any });

  if (!ADMIN_API_TOKENS.length) {
    logger.warn("ADMIN_API_TOKENS is empty");
  }

  const botContext = TG_BOT_TOKEN ? makeBot() : null;

  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  server.addHook("onRequest", (req, reply, done) => {
    if (req.url.startsWith("/admin") || req.url.startsWith("/api/admin")) {
      return ipAllowlistMiddleware(req, reply, done);
    }
    done();
  });

  await server.register(
    async (admin) => {
      await admin.register(rateLimit, {
        max: ADMIN_RATE_LIMIT_MAX,
        timeWindow: "1 minute",
        keyGenerator: (req) =>
          String(
            req.headers["x-admin-token"] ||
              (req.headers.authorization || "").slice("Bearer ".length) ||
              req.ip,
          ),
      });

      admin.addHook("preHandler", adminGuard);

      await admin.register(adminRoutes);
      await admin.register(adminCategoriesRoutes);
      await admin.register(adminNotesRoutes);
      await admin.register(adminSavedRepliesRoutes);
      await admin.register(adminCasesRoutes);
      await admin.register(adminAskBotRoutes);
      await admin.register(adminStreamRoutes);
    },
    { prefix: "/api/admin" },
  );

  await server.register(adminMessageRoutes);

  await server.register(fastifyStatic, {
    root: path.join(__dirname, "../operator-admin-out"),
    prefix: "/admin/",
  });

  server.get("/", async (_req, reply) => {
    reply.redirect("/admin");
  });

  server.get("/admin/*", async (_req, reply) => {
    reply.sendFile("index.html");
  });

  server.get("/healthz", async () => ({ ok: true }));

  server.post(
    `${TG_WEBHOOK_PATH}/:token?`,
    {
      preHandler: (request, reply, done) => {
        if (TG_WEBHOOK_SECRET) {
          const headerTok = request.headers[
            "x-telegram-bot-api-secret-token"
          ] as string | undefined;
          const paramTok = (request.params as any).token as string | undefined;
          if (
            headerTok !== TG_WEBHOOK_SECRET &&
            paramTok !== TG_WEBHOOK_SECRET
          ) {
            reply.status(401).send();
            return;
          }
        }
        done();
      },
    },
    async (request, reply) => {
      try {
        if (botContext) {
          await botContext.bot.handleUpdate(request.body as any);
        }
        reply.send({ ok: true });
      } catch (err) {
        logger.error({ err }, "Webhook handling failed");
        reply.code(500).send({ ok: false });
      }
    },
  );

  server.setErrorHandler((err, _req, reply) => {
    const { status, body } = classifyError(err);
    reply.code(status).send(body);
  });

  return server;
}

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const { PORT } = envSchema.parse(process.env);
      const server = await buildServer();
      await server.listen({ port: PORT, host: "0.0.0.0" });
      logger.info(`Server running on port ${PORT}`);

      if (
        TELEGRAM_SET_WEBHOOK_ON_START &&
        PUBLIC_URL &&
        TG_WEBHOOK_SECRET &&
        TG_BOT_TOKEN
      ) {
        (async () => {
          try {
            const url = `${PUBLIC_URL}${TG_WEBHOOK_PATH}/${TG_WEBHOOK_SECRET}`;
            const body = new URLSearchParams({
              url,
              secret_token: TG_WEBHOOK_SECRET,
            });
            await fetch(
              `https://api.telegram.org/bot${TG_BOT_TOKEN}/setWebhook`,
              {
                method: "POST",
                body,
              },
            );
            logger.info({ url }, "[webhook] set");
          } catch (e) {
            logger.error({ err: e }, "[webhook] set error");
          }
        })();
      }

      const stop = async (sig: string) => {
        try {
          if (botContext) await botContext.bot.stop(sig);
          await server.close();
        } finally {
          process.exit(0);
        }
      };
      process.once("SIGINT", () => stop("SIGINT"));
      process.once("SIGTERM", () => stop("SIGTERM"));
    } catch (err) {
      logger.error({ err }, "Failed to start server");
    }
  })();
}
