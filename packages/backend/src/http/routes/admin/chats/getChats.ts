import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const getChatsRoute: FastifyPluginAsync = (server, opts) => {
  server.get(
    '/chats',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement chats listing
      return { chats: [] };
    },
  );

  return;
};

export default fp(getChatsRoute);
