import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
<<<<<<< HEAD

interface User {
  id: string;
  email: string;
  name: string;
}

interface IUserRepo {
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name: string }): Promise<User>;
  list(opts: { limit: number; cursor?: string }): Promise<{
    items: User[];
    nextCursor?: string;
  }>;
}

type PluginOpts = { repo: IUserRepo };

const usersPlugin: FastifyPluginAsync<PluginOpts> = async (
  fastify: FastifyInstance,
  opts: PluginOpts,
) => {
  fastify.get("/users", async (_req: FastifyRequest, _reply: FastifyReply) => {
    const { items, nextCursor } = await opts.repo.list({ limit: 20 });
=======
import fp from "fastify-plugin";
import type { IUserRepo } from "@app/shared";

const usersPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const { userRepo } = fastify.deps;
  
  fastify.get("/users", async (_req: FastifyRequest, _reply: FastifyReply) => {
    const { items, nextCursor } = await userRepo.list({ limit: 20 });
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
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

