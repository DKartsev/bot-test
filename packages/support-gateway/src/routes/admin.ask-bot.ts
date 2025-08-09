import { FastifyInstance } from 'fastify';

export default async function adminAskBotRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.verifyOperatorAuth);

  server.post('/ask-bot', async (_request, reply) => {
    reply.send({ answer: 'Заглушка: бот ещё не подключён' });
  });
}
