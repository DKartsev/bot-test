import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../middlewares/authMiddleware.js";

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /db/status
  server.get(
    "/db/status",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement database status check
      return { status: "ok" };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
