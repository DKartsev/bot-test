import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../../middlewares/authMiddleware.js";

const getMessagesRoute: FastifyPluginAsync = (server, _opts) => {
  
  server.get(
    "/conversations/:id/messages",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement messages listing
      return { messages: [] };
    },
  );

  return Promise.resolve();
};

export default fp(getMessagesRoute);
