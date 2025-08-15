import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const adminUsersRoutes: FastifyPluginAsync = (server, _opts) => {
  // GET /users
  server.get(
    "/users",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement users listing
      return { users: [] };
    },
  );

  // POST /users
  server.post(
    "/users",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, reply) => {
      // TODO: Implement user creation
      return reply.code(201).send({ message: "User created" });
    },
  );

  return Promise.resolve();
};

export default fp(adminUsersRoutes);
