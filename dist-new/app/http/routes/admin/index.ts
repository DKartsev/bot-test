import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const adminRoutes: FastifyPluginAsync = (server, opts) => {
  // Admin routes are registered in admin plugin
  return;
};

export default fp(adminRoutes);
