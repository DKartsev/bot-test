import { FastifyPluginAsync } from "fastify";
import { supabase } from "../../../../infra/db/connection.js";
import { GetChatParamsSchema } from "./schemas.js";

const getChatRoute: FastifyPluginAsync = async (server) => {
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
};

export default getChatRoute;
