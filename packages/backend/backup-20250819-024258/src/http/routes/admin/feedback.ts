import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../middlewares/authMiddleware.js';

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /feedback
  server.get(
    '/feedback',
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement feedback listing
      return { feedback: [] };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
