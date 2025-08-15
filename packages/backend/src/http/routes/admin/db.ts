import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /db/status
  server.get(
    "/db/status",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement database status check
      return { status: "ok" };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
