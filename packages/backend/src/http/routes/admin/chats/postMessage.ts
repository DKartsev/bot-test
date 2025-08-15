import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const postMessageRoute: FastifyPluginAsync = (server, _opts) => {
  server.post(
    "/chats/:id/messages",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, reply) => {
      // TODO: Implement message posting
      return reply.code(201).send({ message: "Message posted" });
    },
  );

  return Promise.resolve();
};

export default fp(postMessageRoute);
