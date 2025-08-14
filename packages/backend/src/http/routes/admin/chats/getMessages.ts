import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../../../../infra/db/connection.js";
import { GetChatParamsSchema } from "./schemas.js";

const GetMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().default(50),
});

const getMessagesRoute: FastifyPluginAsync = async (server) => {
  server.get(
    "/chats/:chat_id/messages",
    {
      schema: {
        params: GetChatParamsSchema,
        querystring: GetMessagesQuerySchema,
        // TODO: Add response schema
      },
    },
    async (request, reply) => {
      const { chat_id } = request.params;
      const { cursor, limit } = request.query;

      let query = supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chat_id)
        .order("created_at", { ascending: false });

      if (cursor) {
        query = query.lt("created_at", cursor);
      }
      query = query.limit(limit + 1);

      const { data, error } = await query;

      if (error) {
        request.log.error({ error, chat_id }, "Failed to fetch messages");
        throw new Error("Failed to fetch messages");
      }

      let nextCursor: string | null = null;
      if (data.length > limit) {
        const nextItem = data.pop();
        nextCursor = nextItem?.created_at || null;
      }

      return reply.send({ messages: data.reverse(), nextCursor });
    },
  );
};

export default getMessagesRoute;
