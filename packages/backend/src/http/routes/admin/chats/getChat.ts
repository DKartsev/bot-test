import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const getChatRoute: FastifyPluginAsync = async (server, _opts) => {
  server.get(
    "/chats/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      // TODO: Implement chat retrieval logic
      return { chat: {} };
    },
  );
};

export default fp(getChatRoute as any);
