import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const adminStreamRoutes: FastifyPluginAsync = async (server) => {
  const { eventBus } = server.deps;

  server.get("/stream", (request, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    const send = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const pingInterval = setInterval(() => send("ping", {}), 15000);

    const listeners: Record<string, (...args: any[]) => void> = {
      handoff: (p: any) => send("handoff", p),
      new_user_msg: (p: any) => send("user_msg", p),
      operator_reply: (p: any) => send("op_reply", p),
      media_updated: (p: any) => send("media_upd", p),
      assigned: (p: any) => send("assigned", p),
    };

    for (const event in listeners) {
      eventBus.on(event, listeners[event]);
    }

    request.raw.on("close", () => {
      clearInterval(pingInterval);
      for (const event in listeners) {
        eventBus.off(event, listeners[event]);
      }
      server.log.info("SSE client disconnected");
    });
  });
};

export default fp(adminStreamRoutes);
