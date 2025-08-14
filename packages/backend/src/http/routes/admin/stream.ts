import { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";

const adminStreamRoutes: FastifyPluginCallback = (server, _opts, done) => {
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
      "message.new": (p) => send("message.new", p),
      "chat.assigned": (p) => send("chat.assigned", p),
      "chat.status_changed": (p) => send("chat.status_changed", p),
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
  done();
};

export default fp(adminStreamRoutes);
