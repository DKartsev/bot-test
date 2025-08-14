import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { supabase } from "../../../../infra/db/connection.js";
import { AppError } from "../../../../utils/errorHandler.js";

const getMessagesRoute: FastifyPluginAsync = async (server) => {
  server.get("/conversations/:id/messages", async (req, _reply) => {
    const { id } = req.params as { id: string };
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at");
    if (error) throw new AppError(error.message, 500);
    return data || [];
  });
};

export default fp(getMessagesRoute);
