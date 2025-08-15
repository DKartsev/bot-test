import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../../middlewares/authMiddleware.js";

const postReplyRoute: FastifyPluginAsync = (server, _opts) => {
  server.post(
    "/conversations/:id/reply",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, reply) => {
      // TODO: Implement reply posting
      return reply.code(201).send({ message: "Reply posted" });
    },
  );

  return Promise.resolve();
};

export default fp(postReplyRoute);
