import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { supabase } from "../../../../infra/db/connection.js";
import { AppError } from "../../../utils/errorHandler.js";

<<<<<<< HEAD
const getConversationsRoute: FastifyPluginAsync = async (server, _opts) => {
  server.get(
    "/conversations",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      // TODO: Implement conversation listing logic
      return { conversations: [] };
    },
  );
=======
const ConversationFiltersSchema = z.object({
  status: z.enum(['open', 'closed', 'escalated']).optional(),
  handoff: z.enum(['bot', 'human']).optional(),
  category_id: z.string().optional(),
  assignee_name: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const getConversationsRoute: FastifyPluginAsync = async (server) => {
  server.get(
    "/conversations", 
    {
      schema: {
        querystring: ConversationFiltersSchema,
      },
      preHandler: [server.authenticate, server.authorize(["admin"])],
    },
    async (req, _reply) => {
      const filters = req.query as z.infer<typeof ConversationFiltersSchema>;
      
      let query = supabase
        .from("conversations")
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .order('updated_at', { ascending: false })
        .limit(filters.limit);

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.handoff) query = query.eq('handoff', filters.handoff);
      if (filters.category_id) query = query.eq('category_id', filters.category_id);
      if (filters.assignee_name) query = query.eq('assignee_name', filters.assignee_name);
      if (filters.search) query = query.ilike('user_telegram_id', `%${filters.search}%`);
      if (filters.cursor) query = query.lt('updated_at', filters.cursor);

      const { data, error } = await query;
      
      if (error) {
        throw new AppError("DATABASE_ERROR", error.message, 500);
      }

      return { conversations: data || [] };
    });
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
};

export default fp(getConversationsRoute as any);
