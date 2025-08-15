import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { checkAdminRole } from "../../middlewares/authMiddleware.js";

const adminCategoriesRoutes: FastifyPluginAsync = (server, _opts) => {
  // GET /categories
  server.get(
    "/categories",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, _reply) => {
      // TODO: Implement categories listing
      return { categories: [] };
    },
  );

  // POST /categories
  server.post(
    "/categories",
    { preHandler: [server.authenticate, checkAdminRole] },
    async (_req, reply) => {
      // TODO: Implement category creation
      return reply.code(201).send({ message: "Category created" });
    },
  );

  return Promise.resolve();
};

export default fp(adminCategoriesRoutes);
