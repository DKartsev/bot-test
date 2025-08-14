import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const getMessagesRoute: FastifyPluginAsync = async (server, _opts) => {
  server.get(
    "/conversations/:id/messages",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      // TODO: Implement message listing logic
      return { messages: [] };
    },
  );
};

export default fp(getMessagesRoute as any);
