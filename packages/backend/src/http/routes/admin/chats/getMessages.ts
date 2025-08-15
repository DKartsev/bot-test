import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const getMessagesRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    "/chats/:id/messages",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement messages listing
      return { messages: [] };
    },
  );

  return Promise.resolve();
};

export default fp(getMessagesRoute);
