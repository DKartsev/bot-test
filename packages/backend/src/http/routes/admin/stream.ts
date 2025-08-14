import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

<<<<<<< HEAD
const adminStreamRoutes: FastifyPluginAsync = async (server, _opts) => {
=======
const adminStreamRoutes: FastifyPluginAsync = async (server) => {
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
  const { eventBus } = server.deps;

  server.get(
    "/events",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    (request, reply) => {
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders();

      const send = (event: string, data: unknown) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const pingInterval = setInterval(() => send("ping", {}), 15000);

      const listeners: Record<string, (...args: unknown[]) => void> = {
        "user_msg": (p) => send("user_msg", p),
        "assigned": (p) => send("assigned", p),
        "handoff": (p) => send("handoff", p),
        "op_reply": (p) => send("op_reply", p),
        "media_upd": (p) => send("media_upd", p),
      };

      for (const event in listeners) {
        const listener = listeners[event];
        if (listener) {
          eventBus.on(event, listener);
        }
      }
<<<<<<< HEAD
      server.log.info("SSE client disconnected");
    });
  });
=======

      request.raw.on("close", () => {
        clearInterval(pingInterval);
        for (const event in listeners) {
          const listener = listeners[event];
          if (listener) {
            eventBus.off(event, listener);
          }
        }
        server.log.info("SSE client disconnected");
      });
    },
  );
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
};

export default fp(adminStreamRoutes as any);
