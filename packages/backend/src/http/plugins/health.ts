import type { FastifyPluginAsync } from "fastify";

export const healthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async () => ({ status: "ok" }));
};

export default healthPlugin;
