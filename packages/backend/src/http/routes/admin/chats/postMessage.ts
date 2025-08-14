import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../../../../infra/db/connection.js";
import { GetChatParamsSchema } from "./schemas.js";

const PostMessageBodySchema = z.object({
  text: z.string().min(1),
  // attachments: z.array(z.any()).optional(), // Placeholder for attachments
});

const postMessageRoute: FastifyPluginAsync = async (server) => {
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
};

export default postMessageRoute;
