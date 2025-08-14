import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { supabase } from "../../../infra/db/connection.js";
import { AppError } from "../../../utils/errorHandler.js";

const adminCategoriesRoutes: FastifyPluginAsync = async (server, _opts) => {
  // GET /categories
  server.get(
    "/categories",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw new AppError(error.message, 500);
      return { categories: data || [] };
    },
  );

  // POST /categories
  server.post(
    "/categories",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { data, error } = await supabase
        .from("categories")
        .insert(req.body)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return reply.code(201).send(data);
    },
  );

  // PATCH /categories/:id
  server.patch(
    "/categories/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("categories")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return data;
    },
  );

  // DELETE /categories/:id
  server.delete(
    "/categories/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      if (error) throw new AppError(error.message, 500);
      return reply.code(204).send();
    },
  );
};

export default fp(adminCategoriesRoutes as any);
