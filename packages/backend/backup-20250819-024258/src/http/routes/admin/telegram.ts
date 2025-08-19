import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../middlewares/authMiddleware.js';

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /telegram/status
  server.get(
    '/telegram/status',
    {
      preHandler: [
        checkAuth,
        checkAdminRole,
      ],
    },
    async (_req, _reply) => {
      // TODO: Implement Telegram status check
      return { status: 'ok' };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
