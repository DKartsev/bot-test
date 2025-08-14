import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../../../../infra/db/connection.js";
import { GetChatParamsSchema } from "./schemas.js";

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

const postStatusRoute: FastifyPluginAsync = async (server) => {
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
};

export default postStatusRoute;
