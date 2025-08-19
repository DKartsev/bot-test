import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const postStatusRoute: FastifyPluginAsync = (server, _opts) => {
  server.post(
    '/chats/:id/status',
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, reply) => {
      // TODO: Implement status update
      return reply.code(200).send({ message: 'Status updated' });
    },
  );

  return Promise.resolve();
};

export default fp(postStatusRoute);
