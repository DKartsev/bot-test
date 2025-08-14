import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { supabase } from "../../../infra/db/connection.js";
import { AppError } from "../../../utils/errorHandler.js";

const adminSavedRepliesRoutes: FastifyPluginAsync = async (server, _opts) => {
  // GET /saved-replies
  server.get(
    "/saved-replies",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { search, tag } = req.query as { search?: string; tag?: string };
      let query = supabase
        .from("saved_replies")
      .select("*")
      .order("updated_at", { ascending: false });
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    if (tag) {
      query = query.contains("tags", [tag]);
    }
    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    return { replies: data || [] };
  });

  // POST /saved-replies
  server.post(
    "/saved-replies",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { data, error } = await supabase
        .from("saved_replies")
        .insert(req.body)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return reply.code(201).send(data);
    },
  );

  // PATCH /saved-replies/:id
  server.patch(
    "/saved-replies/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("saved_replies")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return data;
    },
  );

  // DELETE /saved-replies/:id
  server.delete(
    "/saved-replies/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { error } = await supabase
        .from("saved_replies")
        .delete()
        .eq("id", id);
      if (error) throw new AppError(error.message, 500);
      return reply.code(204).send();
    },
  );
};

export default fp(adminSavedRepliesRoutes as any);
