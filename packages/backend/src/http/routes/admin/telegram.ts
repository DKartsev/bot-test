import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = (server, _opts) => {
  // GET /telegram/status
  server.get(
    "/telegram/status",
    { 
      preHandler: [
        server.authenticate, 
        (req, reply, done) => {
          // Встроенная проверка роли admin
          const userRole = (req.headers["x-user-role"] as string) || "";
          if (userRole !== "admin") {
            reply.status(403).send({ error: "Forbidden" });
            return;
          }
          done();
        }
      ] 
    },
    async (_req, _reply) => {
      // TODO: Implement Telegram status check
      return { status: "ok" };
    },
  );

  return Promise.resolve();
};

export default fp(plugin);
