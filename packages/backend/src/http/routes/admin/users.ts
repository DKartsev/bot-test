import { FastifyPluginCallback } from "fastify";
import { z } from "zod";

const GetUserParamsSchema = z.object({
  user_id: z.string(), // Can be a UUID or a Telegram ID, for now just a string
});

const adminUsersRoutes: FastifyPluginCallback = (server, _opts, done) => {
  // GET /api/admin/users/{user_id}
  server.get(
    "/users/:user_id",
    {
      schema: {
        params: GetUserParamsSchema,
        // TODO: Add response schema
      },
      preHandler: [server.authenticate, server.authorize(["admin"])],
    },
    async (request, reply) => {
      const { user_id } = request.params as z.infer<
        typeof GetUserParamsSchema
      >;

      // This is a placeholder as per the requirements.
      // In a real implementation, this would fetch from the 'users' table.
      const dummyUser = {
        id: user_id,
        telegram_id: `tg_${user_id}`,
        username: `user_${user_id}`,
        created_at: new Date().toISOString(),
        verification_status: "verified",
      };

      return reply.send({ user: dummyUser });
    },
  );
  done();
};

export default adminUsersRoutes;
