import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import type { IUserRepo } from "@app/shared";

const usersPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { userRepo } = fastify.deps;
  
  fastify.get("/users", async (_req: FastifyRequest, _reply: FastifyReply) => {
    const { items, nextCursor } = await userRepo.list({ limit: 20 });
    return nextCursor ? { items, nextCursor } : { items };
  });

  fastify.post(
    "/users",
    async (
      req: FastifyRequest<{ Body: { name: string; email: string } }>,
      reply: FastifyReply,
    ) => {
      const user = await userRepo.create(req.body);
      void reply.code(201);
      return user;
    },
  );
};

