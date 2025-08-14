import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = async (app, _opts) => {
  app.get(
    "/feedback",
    { preHandler: [app.authenticate, app.authorize(["admin"])] },
    async (req, _reply) => {
      // TODO: Implement feedback listing logic
      return { feedback: [] };
    },
  );
};

export default fp(plugin as any);
