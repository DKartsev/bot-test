import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const postReplyRoute: FastifyPluginAsync = (server, _opts) => {
  server.post(
    "/conversations/:id/reply",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, reply) => {
      // TODO: Implement reply posting
      return reply.code(201).send({ message: "Reply posted" });
    },
  );

  return Promise.resolve();
};

export default fp(postReplyRoute);
