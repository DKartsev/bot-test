import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAuth, checkAdminRole } from "../../middlewares/authMiddleware.js";

const adminStreamRoutes: FastifyPluginAsync = (server, _opts) => {
  // GET /stream
  server.get(
    "/stream",
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement stream endpoint
      return { stream: [] };
    },
  );

  return Promise.resolve();
};

export default fp(adminStreamRoutes);
