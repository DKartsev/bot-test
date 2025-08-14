import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../../../../infra/db/connection.js";

const GetChatsQuerySchema = z.object({
  status: z.array(z.string()).optional(),
  assigneeId: z.string().optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
  q: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().default(20),
  sortBy: z.enum(["unanswered_time", "updated_at"]).default("updated_at"),
});

const getChatsRoute: FastifyPluginAsync = async (server) => {
  server.get(
    "/chats",
    {
      schema: {
        querystring: GetChatsQuerySchema,
        // TODO: Add response schema
      },
    },
    async (request, reply) => {
      const {
        status,
        assigneeId,
        priority,
        tags,
        q,
        dateFrom,
        dateTo,
        cursor,
        limit,
        sortBy,
      } = request.query;

      let query = supabase.from("chats").select("*");

      if (status) {
        query = query.in("status", status);
      }
      if (assigneeId) {
        query = query.eq("assignee_id", assigneeId);
      }
      if (priority) {
        query = query.eq("priority", priority);
      }
      if (tags) {
        query = query.contains("tags", tags);
      }
      if (q) {
        // Simple search on content, assuming a 'messages' table relation
        // This is a placeholder for a more complex search implementation
        query = query.or(`content.ilike.%${q}%`, {
          referencedTable: "messages",
        });
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", dateTo);
      }

      // Sorting
      if (sortBy === "unanswered_time") {
        // Placeholder for more complex sorting logic
        query = query.order("last_user_message_at", { ascending: true });
      } else {
        query = query.order("updated_at", { ascending: false });
      }

      // Pagination
      if (cursor) {
        // This assumes cursor is the 'updated_at' of the last item
        query = query.lt("updated_at", cursor);
      }
      query = query.limit(limit + 1); // Fetch one extra to determine if there's a next page

      const { data, error } = await query;

      if (error) {
        request.log.error({ error }, "Failed to fetch chats");
        throw new Error("Failed to fetch chats");
      }

      let nextCursor: string | null = null;
      if (data.length > limit) {
        const nextItem = data.pop();
        nextCursor = nextItem?.updated_at || null;
      }

      return reply.send({ chats: data, nextCursor });
    },
  );
};

export default getChatsRoute;
