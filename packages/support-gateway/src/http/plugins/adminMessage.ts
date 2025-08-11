import fp from "fastify-plugin";
import adminGuard from "../middlewares/adminGuard.js";
import { generateResponse } from "../../services/ragService.js";

export default fp(async (app) => {
  app.route({
    method: "POST",
    url: "/api/admin/message",
    preHandler: [adminGuard],
    schema: {
      tags: ["admin"],
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["text"],
        properties: {
          text: { type: "string", minLength: 1 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            response: { type: "string" },
          },
        },
        401: { type: "object", properties: { error: { type: "string" } } },
      },
    },
    handler: async (req, reply) => {
      const { text } = req.body as any;
      try {
        const response = await generateResponse(text);
        return reply.send({ response });
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 429 || (status && status >= 500)) {
          req.log[status === 429 ? "warn" : "error"](
            { provider: "openai", status, code: err.code },
            "openai error",
          );
        }
        throw err;
      }
    },
  });
});
