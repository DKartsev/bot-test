import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../middlewares/authMiddleware.js';

const adminSavedRepliesRoutes: FastifyPluginAsync = (server, opts) => {
  // GET /saved-replies
  server.get(
    '/saved-replies',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement saved replies listing
      return { savedReplies: [] };
    },
  );

  // POST /saved-replies
  server.post(
    '/saved-replies',
    { preHandler: [checkAuth, checkAdminRole] },
    async (req, reply) => {
      // TODO: Implement saved reply creation
      return reply.code(201).send({ message: 'Saved reply created' });
    },
  );

  return;
};

export default fp(adminSavedRepliesRoutes);
