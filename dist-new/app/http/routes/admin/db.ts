import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../middlewares/authMiddleware.js';

const plugin: FastifyPluginAsync = (server, opts) => {
  // GET /db/status
  server.get(
    '/db/status',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement database status check
      return { status: 'ok' };
    },
  );

  return;
};

export default fp(plugin);
