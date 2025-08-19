import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const postStatusRoute: FastifyPluginAsync = (server, opts) => {
  server.post(
    '/chats/:id/status',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement status update
      return reply.code(200).send({ message: 'Status updated' });
    },
  );

  return;
};

export default fp(postStatusRoute);
