import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../../../infra/db/connection.js";

// Zod schema for the GET /chats querystring
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

const adminChatsRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/admin/chats
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

  // POST /api/admin/chats/{chat_id}/messages
  const PostMessageBodySchema = z.object({
    text: z.string().min(1),
    // attachments: z.array(z.any()).optional(), // Placeholder for attachments
  });

  server.post(
    "/chats/:chat_id/messages",
    {
      schema: {
        params: GetChatParamsSchema,
        body: PostMessageBodySchema,
      },
    },
    async (request, reply) => {
      const { chat_id } = request.params;
      const { text } = request.body;

      // TODO: In a real app, we would get the operator's ID from their JWT (e.g., req.user.sub)
      const operatorId = "operator-placeholder";

      // 1. Save the message to our database
      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          chat_id: chat_id,
          sender_type: "operator",
          sender_id: operatorId,
          content: text,
        })
        .select()
        .single();

      if (msgError) {
        request.log.error(
          { msgError, chat_id },
          "Failed to save operator message",
        );
        throw new Error("Failed to save message");
      }

      // 2. TODO: Send the message to the user via Telegram
      // This requires fetching the user's Telegram ID from the chats table.

      // 3. TODO: Emit message.new event

      return reply.code(201).send({ message });
    },
  );

  // POST /api/admin/chats/{chat_id}/status
  const ChangeStatusBodySchema = z.object({
    status: z.enum([
      "new",
      "in_progress",
      "waiting_user",
      "waiting_bot",
      "requires_operator",
      "resolved",
      "closed",
    ]),
    reason: z.string().optional(),
  });

  server.post(
    "/chats/:chat_id/status",
    {
      schema: {
        params: GetChatParamsSchema,
        body: ChangeStatusBodySchema,
      },
    },
    async (request, reply) => {
      const { chat_id } = request.params;
      const { status, reason } = request.body;

      const { data, error } = await supabase
        .from("chats")
        .update({ status: status, status_reason: reason }) // Assuming a 'status_reason' column
        .eq("id", chat_id)
        .select()
        .single();

      if (error) {
        request.log.error(
          { error, chat_id, status },
          "Failed to update chat status",
        );
        throw new Error("Failed to update chat status");
      }
      if (!data) {
        return reply.code(404).send({ error: "Chat not found" });
      }

      // TODO: Emit chat.status_changed event
      return reply.send({ chat: data });
    },
  );

  // GET /api/admin/chats/{chat_id}/messages
  const GetMessagesQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().positive().default(50),
  });

  server.get(
    "/chats/:chat_id/messages",
    {
      schema: {
        params: GetChatParamsSchema, // re-use from previous route
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

  // GET /api/admin/chats/{chat_id}
  const GetChatParamsSchema = z.object({
    chat_id: z.string().uuid(),
  });

  server.get(
    "/chats/:chat_id",
    {
      schema: {
        params: GetChatParamsSchema,
        // TODO: Add response schema
      },
    },
    async (request, reply) => {
      const { chat_id } = request.params;
      const { data: chat, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chat_id)
        .single();

      if (error) {
        request.log.error({ error, chat_id }, "Failed to fetch chat");
        throw new Error("Chat not found");
      }
      if (!chat) {
        return reply.code(404).send({ error: "Chat not found" });
      }

      // TODO: Fetch last N messages as well
      return reply.send({ chat });
    },
  );

  // POST /api/admin/chats/{chat_id}/assign
  const AssignChatBodySchema = z.object({
    operatorId: z.string().uuid().nullable(), // null to unassign
  });

  server.post(
    "/chats/:chat_id/assign",
    {
      schema: {
        params: GetChatParamsSchema,
        body: AssignChatBodySchema,
      },
    },
    async (request, reply) => {
      const { chat_id } = request.params;
      const { operatorId } = request.body;

      const { data, error } = await supabase
        .from("chats")
        .update({ assignee_id: operatorId })
        .eq("id", chat_id)
        .select()
        .single();

      if (error) {
        request.log.error(
          { error, chat_id, operatorId },
          "Failed to assign chat",
        );
        throw new Error("Failed to assign chat");
      }
      if (!data) {
        return reply.code(404).send({ error: "Chat not found" });
      }

      // TODO: Emit chat.assigned event
      return reply.send({ chat: data });
    },
  );

  // Other chat-related routes will be added here...
};

export default adminChatsRoutes;
