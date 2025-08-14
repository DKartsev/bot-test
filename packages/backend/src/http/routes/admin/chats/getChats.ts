import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const getChatsRoute: FastifyPluginAsync = async (server, _opts) => {
  server.get(
    "/chats",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      // TODO: Implement chat listing logic
      return { chats: [] };
    },
  );
};

export default fp(getChatsRoute as any);
