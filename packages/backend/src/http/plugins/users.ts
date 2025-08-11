import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { UserService } from "../../modules/users/app/UserService.js";
import type { IUserRepo } from "../../modules/users/domain/User.js";

interface Opts {
  repo: IUserRepo;
}

const plugin: FastifyPluginAsync<Opts> = async (fastify, opts) => {
  const service = new UserService(opts.repo);

  const userSchema = {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      name: { type: "string" },
    },
    required: ["id", "email", "name"],
  } as const;

  fastify.post(
    "/register",
    {
      schema: {
        tags: ["users"],
        body: {
          type: "object",
          required: ["email", "name"],
          properties: {
            email: { type: "string", format: "email" },
            name: { type: "string" },
          },
        },
        response: {
          201: userSchema,
          409: {
            type: "object",
            properties: {
              error: { type: "string" },
              code: { type: "string" },
            },
            required: ["error"],
          },
        },
      },
    },
    async (req, reply) => {
      const { email, name } = req.body as any;
      const user = await service.register(email, name);
      reply.code(201).send(user);
    },
  );

  fastify.get(
    "/",
    {
      schema: {
        tags: ["users"],
        querystring: {
          type: "object",
          properties: {
            cursor: { type: "string" },
            limit: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              items: { type: "array", items: userSchema },
              nextCursor: { type: "string" },
            },
            required: ["items"],
          },
        },
      },
    },
    async (req, reply) => {
      const { cursor, limit } = req.query as any;
      const result = await opts.repo.list({ cursor, limit: Number(limit) });
      reply.send(result);
    },
  );
};

export const usersPlugin = fp<Opts>(plugin, { encapsulate: true });
