import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { supabase } from "../../../infra/db/connection.js";
import { AppError } from "../../utils/errorHandler.js";

<<<<<<< HEAD
const adminNotesRoutes: FastifyPluginAsync = async (server, _opts) => {
=======
const CreateNoteSchema = z.object({
  content: z.string().min(1),
  author_name: z.string().min(1),
  message_id: z.string().optional(),
});

const adminNotesRoutes: FastifyPluginAsync = async (server) => {
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
  // GET /conversations/:id/notes
  server.get(
    "/conversations/:id/notes",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("operator_notes")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at");
      if (error) throw new AppError("DATABASE_ERROR", error.message, 500);
      return { notes: data || [] };
    });

  // POST /conversations/:id/notes
  server.post(
    "/conversations/:id/notes",
    { 
      schema: { body: CreateNoteSchema },
      preHandler: [server.authenticate, server.authorize(["admin"])] 
    },
    async (req, reply) => {
      const { id: conversation_id } = req.params as { id: string };
      const body = req.body as z.infer<typeof CreateNoteSchema>;
      const { data, error } = await supabase
        .from("operator_notes")
        .insert({ conversation_id, ...body })
        .select()
        .single();
      if (error) throw new AppError("DATABASE_ERROR", error.message, 500);
      return reply.code(201).send(data);
    },
  );

  // DELETE /notes/:noteId
  server.delete(
    "/notes/:noteId",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { noteId } = req.params as { noteId: string };
      const { error } = await supabase
        .from("operator_notes")
        .delete()
        .eq("id", noteId);
      if (error) throw new AppError("DATABASE_ERROR", error.message, 500);
      return reply.code(204).send();
    },
  );
};

export default fp(adminNotesRoutes as any);
