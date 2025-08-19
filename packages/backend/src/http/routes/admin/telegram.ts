import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../middlewares/authMiddleware.js';

const plugin: FastifyPluginAsync = (server, opts) => {
  // GET /telegram/status
  server.get(
    '/telegram/status',
    {
      preHandler: [
        checkAuth,
        checkAdminRole,
      ],
    },
    async (req, reply) => {
      // TODO: Implement Telegram status check
      return { status: 'ok' };
    },
  );

  return;
};

export default fp(plugin);
