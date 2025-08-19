import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const adminRoutes: FastifyPluginAsync = (_server, _opts) => {
  // Admin routes are registered in admin plugin
  return Promise.resolve();
};

export default fp(adminRoutes);
