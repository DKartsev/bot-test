import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const postMessageRoute: FastifyPluginAsync = (server, opts) => {
  server.post(
    '/chats/:id/messages',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement message posting
      return reply.code(201).send({ message: 'Message posted' });
    },
  );

  return;
};

export default fp(postMessageRoute);
