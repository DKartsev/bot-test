import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { IUserRepo } from "../../modules/users/domain/User.js";

type PluginOpts = { repo: IUserRepo };

const usersPlugin: FastifyPluginAsync<PluginOpts> =
  // eslint-disable-next-line @typescript-eslint/require-await
  async (fastify: FastifyInstance, opts: PluginOpts) => {
    fastify.get(
      "/users",
      async (_req: FastifyRequest, _reply: FastifyReply) => {
        const { items, nextCursor } = await opts.repo.list({});
        return nextCursor ? { items, nextCursor } : { items };
      },
    );

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
  };

export default usersPlugin;
