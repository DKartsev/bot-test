import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const plugin: FastifyPluginAsync = (server, opts) => {
  // POST /bot/webhook
  server.post(
    '/bot/webhook',
    async (req, reply) => {
      // TODO: Implement bot webhook
      return { status: 'ok' };
    },
  );

  return;
};

export default fp(plugin);
