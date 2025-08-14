import { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { assertAdmin, HttpError } from "../../auth.js";

/**
 * Админ-диагностика Telegram: getMe и ping (sendMessage).
 * Требует Authorization: Bearer <один из ADMIN_API_TOKENS>.
 * Не использует Telegraf, ходит напрямую в Telegram Bot API.
 */

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!TOKEN) {
    app.log.warn(
      "TELEGRAM_BOT_TOKEN is not set. /api/admin/telegram/* will 401.",
    );
  }

  // GET /api/admin/telegram/getMe
  app.get("/api/admin/telegram/getMe", async (req, reply) => {
    try {
      assertAdmin(req);
    } catch (e) {
      const err = e as HttpError;
      void reply.code(err.statusCode || 401);
      return { error: "Unauthorized" };
    }
    if (!TOKEN) {
      void reply.code(400);
      return { error: "NoBotToken" };
    }

    const url = `https://api.telegram.org/bot${TOKEN}/getMe`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      return json;
    } catch (err) {
      app.log.error({ err }, "telegram getMe failed");
      void reply.code(502);
      return { error: "UpstreamError" };
    }
  });

  // POST /api/admin/telegram/ping  { chatId: string, text?: string }
  const BodySchema = z.object({
    chatId: z.string().min(1),
    text: z.string().optional(),
  });

  app.post("/api/admin/telegram/ping", async (req, reply) => {
    try {
      assertAdmin(req);
    } catch (e) {
      const err = e as HttpError;
      void reply.code(err.statusCode || 401);
      return { error: "Unauthorized" };
    }
    if (!TOKEN) {
      void reply.code(400);
      return { error: "NoBotToken" };
    }

    const parse = BodySchema.safeParse(req.body);
    if (!parse.success) {
      void reply.code(400);
      return { error: "ValidationError", details: parse.error.flatten() };
    }
    const { chatId, text } = parse.data;

    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text ?? `✅ Ping от сервера (${new Date().toISOString()})`,
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean };
      if (!json.ok) {
        app.log.warn({ json }, "telegram ping not ok");
      }
      return json;
    } catch (err) {
      app.log.error({ err }, "telegram ping failed");
      void reply.code(502);
      return { error: "UpstreamError" };
    }
  });
  done();
};

export default plugin;
