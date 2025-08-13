import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const adminStreamRoutes: FastifyPluginAsync = async (server, _opts) => {
  const { eventBus } = server.deps;

  server.get("/stream", (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const pingInterval = setInterval(() => send("ping", {}), 15000);

    const listeners: Record<string, (...args: unknown[]) => void> = {
      handoff: (p) => send("handoff", p),
      new_user_msg: (p) => send("user_msg", p),
      operator_reply: (p) => send("op_reply", p),
      media_updated: (p) => send("media_upd", p),
      assigned: (p) => send("assigned", p),
    };

    for (const event in listeners) {
      const listener = listeners[event];
      if (listener) {
        eventBus.on(event, listener);
      }
    }

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
  });
};

export default fp(adminStreamRoutes);
