import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../middlewares/authMiddleware.js";

const adminSavedRepliesRoutes: FastifyPluginAsync = (server, _opts) => {
  // GET /saved-replies
  server.get(
    "/saved-replies",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement saved replies listing
      return { savedReplies: [] };
    },
  );

  // POST /saved-replies
  server.post(
    "/saved-replies",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, reply) => {
      // TODO: Implement saved reply creation
      return reply.code(201).send({ message: "Saved reply created" });
    },
  );

  return Promise.resolve();
};

export default fp(adminSavedRepliesRoutes);
