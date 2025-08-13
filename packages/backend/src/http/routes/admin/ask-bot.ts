import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";

const AskBodySchema = z.object({
  question: z.string().min(1),
});

const adminAskBotRoutes: FastifyPluginAsync = async (server) => {
  server.post(
    "/ask-bot",
    {
      schema: {
        body: AskBodySchema,
      },
    },
    async (request, reply) => {
      const { qaService } = server.deps;
      const { question } = request.body as z.infer<typeof AskBodySchema>;

      try {
        const result = await qaService.ask(question);
        return reply.send(result);
      } catch (err) {
        request.log.error({ err }, "ask-bot route failed");
        return reply.code(500).send({ error: "failed_to_ask_bot" });
      }
    },
  );
};

export default fp(adminAskBotRoutes);
