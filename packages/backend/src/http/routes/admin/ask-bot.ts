import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const adminAskBotRoutes: FastifyPluginAsync = (server, _opts) => {
  // POST /ask-bot
  server.post(
    "/ask-bot",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { qaService } = server.deps;
      const { question } = req.body as { question: string };

      try {
        // TODO: Implement bot asking logic
        const result = await qaService.ask(question, "ru");
        return reply.send(result);
      } catch (err) {
        req.log.error({ err }, "Error in ask-bot route");
        return reply
          .code(500)
          .send({ error: "Failed to process your question." });
      }
    },
  );

  return Promise.resolve();
};

export default fp(adminAskBotRoutes);
