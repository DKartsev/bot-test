import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const postReplyRoute: FastifyPluginAsync = (server, opts) => {
  server.post(
    '/conversations/:id/reply',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement reply posting
      return reply.code(201).send({ message: 'Reply posted' });
    },
  );

  return;
};

export default fp(postReplyRoute);
