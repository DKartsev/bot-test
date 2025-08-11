import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
          },
        },
      },
    },
    async () => ({ ok: true }),
  );
};

export const healthPlugin = fp(plugin, { encapsulate: true });
