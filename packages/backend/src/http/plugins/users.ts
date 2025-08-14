import type {
  FastifyInstance,
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { IUserRepo } from "@app/shared";

type PluginOpts = { repo: IUserRepo };

const usersPlugin: FastifyPluginCallback<PluginOpts> = (
  fastify: FastifyInstance,
  opts: PluginOpts,
  done: (err?: Error) => void,
) => {
  fastify.get("/users", async (_req: FastifyRequest, _reply: FastifyReply) => {
    const { items, nextCursor } = await opts.repo.list({});
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
  done();
};

export default usersPlugin;
