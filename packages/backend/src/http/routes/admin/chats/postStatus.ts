import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const postStatusRoute: FastifyPluginAsync = async (server, _opts) => {
  server.post(
    "/chats/:id/status",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      // TODO: Implement status change logic
      return reply.code(200).send({ message: "Status changed" });
    },
  );
};

export default fp(postStatusRoute as any);
