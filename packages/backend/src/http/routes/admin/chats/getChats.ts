import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAuth, checkAdminRole } from "../../../middlewares/authMiddleware.js";

const getChatsRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    "/chats",
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement chats listing
      return { chats: [] };
    },
  );

  return Promise.resolve();
};

export default fp(getChatsRoute);
