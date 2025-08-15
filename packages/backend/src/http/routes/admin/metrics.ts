import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../middlewares/authMiddleware.js";

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /metrics
  server.get(
    "/metrics",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement metrics collection
      return { metrics: {} };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
