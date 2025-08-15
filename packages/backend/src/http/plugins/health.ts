import type { FastifyPluginAsync } from "fastify";

const healthPlugin: FastifyPluginAsync = (fastify, _opts) => {
  fastify.get("/health", async (request, reply) => {
    try {
      // Check database connectivity
      await fastify.pg.query("SELECT 1");
      return { status: "ok", checks: { database: "ok" } };
    } catch (err) {
      request.log.error({ err }, "Health check failed");
      return reply
        .code(503)
        .send({ status: "error", checks: { database: "error" } });
    }
  });

  return Promise.resolve();
};

export default healthPlugin;

