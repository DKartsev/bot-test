import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const adminStreamRoutes: FastifyPluginAsync = (server, _opts) => {
  // GET /stream
  server.get(
    "/stream",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement stream endpoint
      return { stream: [] };
    },
  );

  return Promise.resolve();
};

export default fp(adminStreamRoutes);
