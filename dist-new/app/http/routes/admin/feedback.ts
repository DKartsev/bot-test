import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../middlewares/authMiddleware.js';

const plugin: FastifyPluginAsync = (server, opts) => {
  // GET /feedback
  server.get(
    '/feedback',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement feedback listing
      return { feedback: [] };
    },
  );

  return;
};

export default fp(plugin);
