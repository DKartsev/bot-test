import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const adminNotesRoutes: FastifyPluginAsync = (server, _opts) => {
  // GET /notes
  server.get(
    "/notes",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, _reply) => {
      // TODO: Implement notes listing
      return { notes: [] };
    },
  );

  // POST /notes
  server.post(
    "/notes",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (_req, reply) => {
      // TODO: Implement note creation
      return reply.code(201).send({ message: "Note created" });
    },
  );

  return Promise.resolve();
};

export default fp(adminNotesRoutes);
