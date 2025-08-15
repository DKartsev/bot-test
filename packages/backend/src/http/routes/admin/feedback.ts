import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /feedback
  server.get(
    "/feedback",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement feedback listing
      return { feedback: [] };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
