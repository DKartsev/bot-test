import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";

const AskBodySchema = z.object({
  question: z.string().min(1, "Question cannot be empty."),
  lang: z.string().optional().default("ru"),
});

const apiPlugin: FastifyPluginAsync = (server, _opts, done) => {
  server.post(
    "/ask",
    {
      schema: {
        body: AskBodySchema,
      },
    },
    async (request, reply) => {
      const { qaService } = server.deps;
      const { question, lang } = request.body as z.infer<typeof AskBodySchema>;

      try {
        const result = await qaService.ask(question, lang);
        return reply.send(result);
      } catch (err) {
        request.log.error({ err }, "Error in /ask route");
        // TODO: Use structured error handling
        return reply
          .code(500)
          .send({ error: "Failed to process your question." });
      }
    },
  );
  done();
};

export default fp(apiPlugin);
