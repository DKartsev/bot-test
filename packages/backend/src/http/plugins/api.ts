import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const apiPlugin: FastifyPluginAsync = (server, opts) => {
  server.post(
    '/ask',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['question'],
          properties: {
            question: { type: 'string', minLength: 1 },
            lang: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { qaService } = server.deps;
      const { question, lang } = (request.body as { question: string; lang?: string }) ?? {};

      try {
        const result = await qaService.ask(question, lang ?? 'ru');
        return reply.send(result);
      } catch (err) {
        request.log.error({ err }, 'Error in /ask route');
        return reply
          .code(500)
          .send({ error: 'Failed to process your question.' });
      }
    },
  );

  return;
};

export default fp(apiPlugin);
