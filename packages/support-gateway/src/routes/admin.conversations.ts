import { FastifyInstance } from 'fastify';
import { liveBus } from '../utils/liveBus';

export default async function adminRoutes(server: FastifyInstance) {
  server.addHook('onRequest', async (request, reply) => {
    const auth = request.headers['authorization'];
    const token = auth?.split(' ')[1];
    if (token !== process.env.OPERATOR_API_TOKEN) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  server.get('/stream', async (request, reply) => {
    reply.headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const onHandoff = (payload: { conversation_id: number; text: string }) => {
      reply.raw.write(`event: handoff\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    liveBus.on('handoff', onHandoff);

    request.raw.on('close', () => {
      liveBus.off('handoff', onHandoff);
    });
  });
}
