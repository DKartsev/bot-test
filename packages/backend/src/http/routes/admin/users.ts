import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { supabase } from "../../../infra/db/connection.js";
import { AppError } from "../../../utils/errorHandler.js";

const adminUsersRoutes: FastifyPluginAsync = async (server, _opts) => {
  // GET /users
  server.get(
    "/users",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { data, error } = await supabase
        .from("users")
        .select("id,email,name,created_at")
        .order("created_at", { ascending: false });
      if (error) throw new AppError(error.message, 500);
      return { users: data || [] };
    },
  );

  // POST /users
  server.post(
    "/users",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { data, error } = await supabase
        .from("users")
        .insert(req.body)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return reply.code(201).send(data);
    },
  );

  // PATCH /users/:id
  server.patch(
    "/users/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("users")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return data;
    },
  );

  // DELETE /users/:id
  server.delete(
    "/users/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id);
      if (error) throw new AppError(error.message, 500);
      return reply.code(204).send();
    },
  );
};

export default fp(adminUsersRoutes as any);
