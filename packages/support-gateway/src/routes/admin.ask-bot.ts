import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateResponse } from '../services/ragService';

export default async function adminAskBotRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.verifyOperatorAuth);

  server.post('/ask-bot', async (request, reply) => {
    const bodySchema = z.object({ question: z.string() });
    try {
      const { question } = bodySchema.parse(request.body);
      const answer = await generateResponse(question);
      reply.send({ answer });
    } catch (err) {
      request.log.error({ err }, 'ask-bot failed');
      reply.code(500).send({ error: 'rag_failed' });
    }
  });
}
