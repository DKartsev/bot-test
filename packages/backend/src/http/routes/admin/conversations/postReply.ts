import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { supabase } from "../../../../infra/db/connection.js";
import { AppError, NotFoundError } from "../../../../utils/errorHandler.js";

const postReplyRoute: FastifyPluginAsync = async (server) => {
  const { bot, eventBus } = server.deps;

  server.post("/conversations/:id/reply", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { text } = req.body as { text: string };

    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("user_telegram_id")
      .eq("id", id)
      .single();
    if (convErr || !conv) throw new NotFoundError("conversation");

    await bot.telegram.sendMessage(Number(conv.user_telegram_id), text);

    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender: "operator", content: text })
      .select()
      .single();
    if (msgErr) throw new AppError(msgErr.message, 500);

    eventBus.emit("operator_reply", { conversation_id: id, message: msg });
    return reply.code(201).send(msg);
  });
};

export default fp(postReplyRoute);
