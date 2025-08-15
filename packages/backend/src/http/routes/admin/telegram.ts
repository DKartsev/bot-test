import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /telegram/status
  server.get(
    "/telegram/status",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement Telegram status check
      return { status: "ok" };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
