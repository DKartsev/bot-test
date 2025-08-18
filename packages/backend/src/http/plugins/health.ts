import type { FastifyPluginAsync } from "fastify";

const healthPlugin: FastifyPluginAsync = (fastify, _opts) => {
  fastify.get("/health", async (request, reply) => {
    try {
      const hasPg = (fastify as any).pg && typeof (fastify as any).pg.query === "function";
      if (hasPg) {
        await (fastify as any).pg.query("SELECT 1");
        return { status: "ok", checks: { database: "ok" } };
      }
      // If pg plugin is not registered, still return ok (service is up)
      return { status: "ok", checks: { database: "skipped" } };
    } catch (err) {
      request.log.error({ err }, "❌ Проверка здоровья сервера не пройдена");
      return reply
        .code(503)
        .send({ status: "error", checks: { database: "error" } });
    }
  });

  return Promise.resolve();
};

export default healthPlugin;

