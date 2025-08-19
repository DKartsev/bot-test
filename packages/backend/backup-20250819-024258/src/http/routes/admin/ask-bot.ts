import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { checkAuth } from '../../middlewares/authMiddleware.js';

const adminAskBotRoutes: FastifyPluginAsync = async (server, _opts) => {
  // GET /ask-bot
  server.get(
    '/ask-bot',
    {
      preHandler: [
        checkAuth,
        (req, reply, done) => {
          const userRole = (req.headers['x-user-role'] as string) || '';
          if (userRole !== 'admin') {
            void reply.status(403).send({ error: 'Forbidden' });
            return;
          }
          done();
        },
      ],
    },
    async (_req, _reply) => {
      // TODO: Implement ask bot functionality
      return { message: 'Ask bot endpoint' };
    },
  );

  // POST /ask-bot
  server.post(
    '/ask-bot',
    {
      preHandler: [
        checkAuth,
        (req, reply, done) => {
          const userRole = (req.headers['x-user-role'] as string) || '';
          if (userRole !== 'admin') {
            void reply.status(403).send({ error: 'Forbidden' });
            return;
          }
          done();
        },
      ],
    },
    async (_req, _reply) => {
      // TODO: Implement ask bot functionality
      return { message: 'Ask bot endpoint' };
    },
  );

  // PUT /ask-bot/:id
  server.put(
    '/ask-bot/:id',
    {
      preHandler: [
        checkAuth,
        (req, reply, done) => {
          const userRole = (req.headers['x-user-role'] as string) || '';
          if (userRole !== 'admin') {
            void reply.status(403).send({ error: 'Forbidden' });
            return;
          }
          done();
        },
      ],
    },
    async (_req, _reply) => {
      // TODO: Implement ask bot functionality
      return { message: 'Ask bot endpoint' };
    },
  );

  // DELETE /ask-bot/:id
  server.delete(
    '/ask-bot/:id',
    {
      preHandler: [
        checkAuth,
        (req, reply, done) => {
          const userRole = (req.headers['x-user-role'] as string) || '';
          if (userRole !== 'admin') {
            void reply.status(403).send({ error: 'Forbidden' });
            return;
          }
          done();
        },
      ],
    },
    async (_req, _reply) => {
      // TODO: Implement ask bot functionality
      return { message: 'Ask bot endpoint' };
    },
  );

  return Promise.resolve();
};

export default fp(adminAskBotRoutes);
