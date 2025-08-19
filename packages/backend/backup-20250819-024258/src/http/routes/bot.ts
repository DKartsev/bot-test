import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const plugin: FastifyPluginAsync = (server, _opts) => {
  // POST /bot/webhook
  server.post(
    '/bot/webhook',
    async (_req, _reply) => {
      // TODO: Implement bot webhook
      return { status: 'ok' };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
