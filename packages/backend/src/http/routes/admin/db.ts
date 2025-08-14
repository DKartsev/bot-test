import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = async (app, _opts) => {
  app.get(
    "/db",
    { preHandler: [app.authenticate, app.authorize(["admin"])] },
    async (req, _reply) => {
      // TODO: Implement database status logic
      return { status: "ok" };
    },
  );
};

export default fp(plugin as any);
