import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../../middlewares/authMiddleware.js";

const getConversationsRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    "/conversations",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement conversations listing
      return { conversations: [] };
    },
  );

  return Promise.resolve();
};

export default fp(getConversationsRoute);
