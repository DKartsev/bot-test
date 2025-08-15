import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const getChatsRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    "/chats",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement chats listing
      return { chats: [] };
    },
  );

  return Promise.resolve();
};

export default fp(getChatsRoute);
