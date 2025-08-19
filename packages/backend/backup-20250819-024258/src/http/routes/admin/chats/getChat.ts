import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const getChatRoute: FastifyPluginAsync = (server, _opts) => {
  server.get(
    '/chats/:id',
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement chat retrieval
      return { chat: {} };
    },
  );

  return Promise.resolve();
};

export default fp(getChatRoute);
