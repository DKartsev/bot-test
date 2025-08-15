import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../../middlewares/authMiddleware.js";

const postMessageRoute: FastifyPluginAsync = (server, _opts) => {
  server.post(
    "/chats/:id/messages",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, reply) => {
      // TODO: Implement message posting
      return reply.code(201).send({ message: "Message posted" });
    },
  );

  return Promise.resolve();
};

export default fp(postMessageRoute);
