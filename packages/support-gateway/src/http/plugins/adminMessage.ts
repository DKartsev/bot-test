import fp from "fastify-plugin";
import { adminGuard } from "../middlewares/adminGuard.js";
import { generateResponse } from "../../services/ragService.js";

export default fp(async (app) => {
  app.route({
    method: "POST",
    url: "/message",
    preHandler: [adminGuard],
    schema: {
      tags: ["admin"],
      security: [{ bearerAuth: [] }, { adminApiKey: [] }],
      body: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", minLength: 1 },
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
        403: { type: "object", properties: { error: { type: "string" } } },
      },
    },
    handler: async (req, reply) => {
      const { message } = req.body as any;
      const response = await generateResponse(message);
      return reply.send({ response });
    },
  });
});
