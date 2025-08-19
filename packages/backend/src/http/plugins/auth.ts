import type { FastifyPluginAsync } from 'fastify';

const authPlugin: FastifyPluginAsync = (server, opts) => {
  // Register authentication and authorization functions
  server.decorate(
    'authenticate',
    async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      // TODO: Implement JWT verification
      req.log.warn('JWT verification not implemented yet');
    },
  );

  server.decorate(
    'authorize',
    (allowedRoles: ('admin' | 'operator')[]) =>
      async (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
        if (!req.user || typeof req.user.role !== 'string') {
          return reply.code(403).send({ error: 'Forbidden: Missing role' });
        }
        if (!allowedRoles.includes(req.user.role)) {
          return reply
            .code(403)
            .send({ error: 'Forbidden: Insufficient permissions' });
        }
      },
  );

  server.log.info('🔐 Auth плагин зарегистрирован с декораторами authenticate и authorize.');
  return;
};

export default authPlugin;
