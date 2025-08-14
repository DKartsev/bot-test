import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { supabase } from "../../../../infra/db/connection.js";
import { GetChatParamsSchema } from "./schemas.js";

const AssignChatBodySchema = z.object({
  operatorId: z.string().uuid().nullable(), // null to unassign
});

const postAssignRoute: FastifyPluginAsync = async (server) => {
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
};

export default postAssignRoute;
