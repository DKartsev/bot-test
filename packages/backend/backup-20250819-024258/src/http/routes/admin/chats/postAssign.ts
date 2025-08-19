import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../../middlewares/authMiddleware.js';

const postAssignRoute: FastifyPluginAsync = (server, _opts) => {
  server.post(
    '/chats/:id/assign',
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, reply) => {
      // TODO: Implement chat assignment
      return reply.code(200).send({ message: 'Chat assigned' });
    },
  );

  return Promise.resolve();
};

export default fp(postAssignRoute);
