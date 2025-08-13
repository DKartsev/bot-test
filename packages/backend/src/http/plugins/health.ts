import type { FastifyPluginAsync } from "fastify";

import fp from "fastify-plugin";

export const healthPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.get("/health", () => ({ status: "ok" }));
});

export default healthPlugin;
