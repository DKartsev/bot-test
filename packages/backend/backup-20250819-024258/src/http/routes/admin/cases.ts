import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAdminRole, checkAuth } from '../../middlewares/authMiddleware.js';

const adminCasesRoutes: FastifyPluginAsync = (server, _opts) => {
  // GET /cases
  server.get(
    '/cases',
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement cases listing
      return { cases: [] };
    },
  );

  // POST /cases
  server.post(
    '/cases',
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, reply) => {
      // TODO: Implement case creation
      return reply.code(201).send({ message: 'Case created' });
    },
  );

  // PATCH /cases/:id
  server.patch(
    '/cases/:id',
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement case update
      return { message: 'Case updated' };
    },
  );

  // DELETE /cases/:id
  server.delete(
    '/cases/:id',
    { preHandler: [checkAuth, checkAdminRole] },
    async (_req, reply) => {
      // TODO: Implement case deletion
      return reply.code(204).send();
    },
  );

  return Promise.resolve();
};

export default fp(adminCasesRoutes);
