import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const postMessageRoute: FastifyPluginAsync = async (server, _opts) => {
  server.post(
    "/chats/:id/messages",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      // TODO: Implement message posting logic
      return reply.code(201).send({ message: "Message posted" });
    },
  );
};

export default fp(postMessageRoute as any);
