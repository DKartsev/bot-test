import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const getChatRoute: FastifyPluginAsync = (server, opts) => {
  server.get(
    '/chats/:id',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement chat retrieval
      return { chat: {} };
    },
  );

  return;
};

export default fp(getChatRoute);
