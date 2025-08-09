import { FastifyInstance } from 'fastify';
import { liveBus } from '../lib/liveBus';

export default async function adminStreamRoutes(server: FastifyInstance) {
  server.get(
    '/admin/stream',
    { preHandler: server.verifyOperatorAuth },
    async (request, reply) => {
      reply.headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const send = (event: string, data: any) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const ping = setInterval(() => send('ping', {}), 15000);

      const handoff = (p: { conversation_id: number; text: string }) =>
        send('handoff', p);
      const newUser = (p: { conversation_id: number; message_id: number }) =>
        send('user_msg', p);
      const opReply = (p: { conversation_id: number; message_id: number }) =>
        send('op_reply', p);
      const mediaUpd = (p: { message_id: number; kind: 'transcript' | 'vision' }) =>
        send('media_upd', p);

      liveBus.on('handoff', handoff);
      liveBus.on('new_user_msg', newUser);
      liveBus.on('operator_reply', opReply);
      liveBus.on('media_updated', mediaUpd);

      request.raw.on('close', () => {
        clearInterval(ping);
        liveBus.off('handoff', handoff);
        liveBus.off('new_user_msg', newUser);
        liveBus.off('operator_reply', opReply);
        liveBus.off('media_updated', mediaUpd);
      });
    }
  );
}
