import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const getConversationsRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    "/conversations",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement conversations listing
      return { conversations: [] };
    },
  );

  return Promise.resolve();
};

export default fp(getConversationsRoute);
