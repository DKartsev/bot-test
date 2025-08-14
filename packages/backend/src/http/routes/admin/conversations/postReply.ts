import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const postReplyRoute: FastifyPluginAsync = async (server, _opts) => {
  server.post(
    "/conversations/:id/reply",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      // TODO: Implement reply posting logic
      return reply.code(201).send({ message: "Reply posted" });
    },
  );
};

export default fp(postReplyRoute as any);
