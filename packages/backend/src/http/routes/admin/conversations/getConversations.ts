import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const getConversationsRoute: FastifyPluginAsync = (server, opts) => {
  server.get(
    '/conversations',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement conversations listing
      return { conversations: [] };
    },
  );

  return;
};

export default fp(getConversationsRoute);
