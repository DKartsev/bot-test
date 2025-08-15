import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAuth, checkAdminRole } from "../../middlewares/authMiddleware.js";

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /metrics
  server.get(
    "/metrics",
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement metrics collection
      return { metrics: {} };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
