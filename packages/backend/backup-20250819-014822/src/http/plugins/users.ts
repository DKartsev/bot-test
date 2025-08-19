import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";

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

const usersPlugin: FastifyPluginAsync<PluginOpts> = (fastify, opts) => {
  fastify.get("/users", async (_req: FastifyRequest, _reply: FastifyReply) => {
    const { items, nextCursor } = await opts.repo.list({ limit: 20 });
    return nextCursor ? { items, nextCursor } : { items };
  });

  fastify.post(
    "/users",
    async (
      req: FastifyRequest<{ Body: { name: string; email: string } }>,
      reply: FastifyReply,
    ) => {
      const user = await opts.repo.create(req.body);
      void reply.code(201);
      return user;
    },
  );

  return Promise.resolve();
};

export default usersPlugin;

