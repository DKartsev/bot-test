import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { supabase } from "../../../infra/db/connection.js";
import { AppError } from "../../utils/errorHandler.js";

<<<<<<< HEAD
const adminSavedRepliesRoutes: FastifyPluginAsync = async (server, _opts) => {
=======
const SavedReplySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

const UpdateSavedReplySchema = SavedReplySchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "At least one field must be provided for update." },
);

const adminSavedRepliesRoutes: FastifyPluginAsync = async (server) => {
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
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
      if (error) throw new AppError("DATABASE_ERROR", error.message, 500);
      return { replies: data || [] };
    });

  // POST /saved-replies
  server.post(
    "/saved-replies",
    { 
      schema: { body: SavedReplySchema },
      preHandler: [server.authenticate, server.authorize(["admin"])] 
    },
    async (req, reply) => {
      const { data, error } = await supabase
        .from("saved_replies")
        .insert(req.body)
        .select()
        .single();
      if (error) throw new AppError("DATABASE_ERROR", error.message, 500);
      return reply.code(201).send(data);
    },
  );

  // PATCH /saved-replies/:id
  server.patch(
    "/saved-replies/:id",
    { 
      schema: { body: UpdateSavedReplySchema },
      preHandler: [server.authenticate, server.authorize(["admin"])] 
    },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("saved_replies")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new AppError("DATABASE_ERROR", error.message, 500);
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
      if (error) throw new AppError("DATABASE_ERROR", error.message, 500);
      return reply.code(204).send();
    },
  );
};

export default fp(adminSavedRepliesRoutes as any);
