import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /metrics
  server.get(
    "/metrics",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement metrics collection
      return { metrics: {} };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
