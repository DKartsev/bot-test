import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
<<<<<<< HEAD

const postReplyRoute: FastifyPluginAsync = async (server, _opts) => {
  server.post(
    "/conversations/:id/reply",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      // TODO: Implement reply posting logic
      return reply.code(201).send({ message: "Reply posted" });
=======
import { z } from "zod";
import { supabase } from "../../../../infra/db/connection.js";
import { AppError, NotFoundError } from "../../../utils/errorHandler.js";

const ReplyBodySchema = z.object({
  text: z.string().min(1),
  author_name: z.string().min(1),
});

const postReplyRoute: FastifyPluginAsync = async (server) => {
  const { bot, eventBus } = server.deps;

  server.post(
    "/conversations/:id/reply", 
    {
      schema: {
        body: ReplyBodySchema,
      },
      preHandler: [server.authenticate, server.authorize(["admin"])],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { text, author_name } = req.body as z.infer<typeof ReplyBodySchema>;

      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .select("user_telegram_id")
        .eq("id", id)
        .single();
      if (convErr || !conv) throw new NotFoundError("conversation");

      try {
        await bot.telegram.sendMessage(Number(conv.user_telegram_id), text);
      } catch (err) {
        req.log.error({ err }, "Failed to send Telegram message");
        throw new AppError("TELEGRAM_ERROR", "Failed to send message", 502);
      }

      const { data: msg, error: msgErr } = await supabase
        .from("messages")
        .insert({ 
          conversation_id: id, 
          sender: "operator", 
          content: text 
        })
        .select()
        .single();
      if (msgErr) throw new AppError("DATABASE_ERROR", msgErr.message, 500);

      eventBus.emit("operator_reply", { conversation_id: id, message: msg });
      return reply.code(201).send({ data: msg });
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
    },
  );
};

export default fp(postReplyRoute as any);
