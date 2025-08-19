import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const getMessagesRoute: FastifyPluginAsync = (server, opts) => {

  server.get(
    '/conversations/:id/messages',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement messages listing
      return { messages: [] };
    },
  );

  return;
};

export default fp(getMessagesRoute);
