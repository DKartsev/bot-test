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
      preHandler: [server.authenticate, server.authorize(["admin"])],
    },
    async (request, reply) => {
      const { qaService } = server.deps;
      const { question } = request.body as z.infer<typeof AskBodySchema>;
    }
  )
}


export default fp(adminAskBotRoutes);
