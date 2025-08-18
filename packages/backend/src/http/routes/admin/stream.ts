import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const adminStreamRoutes: FastifyPluginAsync = async (server, _opts) => {
  server.get(
    "/admin/stream",
    async (req, reply) => {
      try {
        const url = new URL(req.url, "http://localhost");
        const token = url.searchParams.get("token") || (req.query as any)?.token;
        const tokensEnv = process.env.ADMIN_API_TOKENS || process.env.ADMIN_API_TOKEN || "";
        const allowed = tokensEnv
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        if (allowed.length && (!token || !allowed.includes(String(token)))) {
          return reply.code(401).send({ error: "Unauthorized" });
        }

        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");
        // Разрешим CORS для фронта
        reply.raw.setHeader(
          "Access-Control-Allow-Origin",
          "https://bot-test-operator-admin.onrender.com",
        );
        // Немедленно отправим заголовки
        (reply.raw as any).flushHeaders?.();

        const send = (event: string, data: any) => {
          reply.raw.write(`event: ${event}\n`);
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        // Первичное приветствие
        send("ready", { ok: true, ts: Date.now() });

        const pingTimer = setInterval(() => {
          try {
            send("ping", { ts: Date.now() });
          } catch {
            // ignore
          }
        }, 30000);

        req.raw.on("close", () => {
          clearInterval(pingTimer);
          try {
            reply.raw.end();
          } catch {
            // ignore
          }
        });

        // Оставляем соединение открытым
        return reply; // не завершаем
      } catch (err) {
        req.log.error({ err }, "sse stream error");
        return reply.code(500).send({ error: "stream error" });
      }
    },
  );

  return Promise.resolve();
};

export default fp(adminStreamRoutes);
