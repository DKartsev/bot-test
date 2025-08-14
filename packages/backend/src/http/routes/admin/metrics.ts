import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = async (app, _opts) => {
  app.get(
    "/metrics",
    { preHandler: [app.authenticate, app.authorize(["admin"])] },
    async (req, _reply) => {
      // TODO: Implement metrics logic
      return { metrics: {} };
    },
  );
};

export default fp(plugin as any);
