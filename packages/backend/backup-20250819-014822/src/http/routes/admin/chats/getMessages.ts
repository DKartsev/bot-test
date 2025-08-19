import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAuth, checkAdminRole } from "../../../middlewares/authMiddleware.js";

const getMessagesRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    "/chats/:id/messages",
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement messages listing
      return { messages: [] };
    },
  );

  return Promise.resolve();
};

export default fp(getMessagesRoute);
