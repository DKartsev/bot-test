import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../../middlewares/authMiddleware.js";

const getChatRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    "/chats/:id",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement chat retrieval
      return { chat: {} };
    },
  );

  return Promise.resolve();
};

export default fp(getChatRoute);
