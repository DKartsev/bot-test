import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const getChatRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    "/chats/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement chat retrieval
      return { chat: {} };
    },
  );

  return Promise.resolve();
};

export default fp(getChatRoute);
