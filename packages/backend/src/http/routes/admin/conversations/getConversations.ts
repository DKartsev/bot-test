import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const getConversationsRoute: FastifyPluginAsync = async (server, _opts) => {
  server.get(
    "/conversations",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      // TODO: Implement conversation listing logic
      return { conversations: [] };
    },
  );
};

export default fp(getConversationsRoute as any);
