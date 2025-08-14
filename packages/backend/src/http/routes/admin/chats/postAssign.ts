import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const postAssignRoute: FastifyPluginAsync = async (server, _opts) => {
  server.post(
    "/chats/:id/assign",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      // TODO: Implement chat assignment logic
      return reply.code(200).send({ message: "Chat assigned" });
    },
  );
};

export default fp(postAssignRoute as any);
