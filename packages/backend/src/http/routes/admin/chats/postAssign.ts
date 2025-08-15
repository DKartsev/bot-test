import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const postAssignRoute: FastifyPluginAsync = (server, _opts) => {
  server.post(
    "/chats/:id/assign",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, reply) => {
      // TODO: Implement chat assignment
      return reply.code(200).send({ message: "Chat assigned" });
    },
  );

  return Promise.resolve();
};

export default fp(postAssignRoute);
