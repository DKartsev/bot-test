import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = async (app: FastifyInstance, _opts) => {
  app.get(
    "/bot",
    async (req, _reply) => {
      // TODO: Implement bot status logic
      return { status: "ok" };
    },
  );
};

export default fp(plugin as any);
