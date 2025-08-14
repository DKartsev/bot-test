import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { supabase } from "../../../infra/db/connection.js";
<<<<<<< HEAD
import { AppError } from "../../../utils/errorHandler.js";
=======
import { env } from "../../../config/env.js";
import { AppError } from "../../utils/errorHandler.js";
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1

const adminCasesRoutes: FastifyPluginAsync = async (server, _opts) => {
  // GET /cases
  server.get(
    "/cases",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new AppError(error.message, 500);
      return { cases: data || [] };
    },
  );

<<<<<<< HEAD
  // POST /cases
  server.post(
    "/cases",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { data, error } = await supabase
        .from("cases")
        .insert(req.body)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return reply.code(201).send(data);
    },
  );

  // PATCH /cases/:id
  server.patch(
    "/cases/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, _reply) => {
      const { id } = req.params as { id: string };
      const { data, error } = await supabase
        .from("cases")
        .update(req.body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new AppError(error.message, 500);
      return data;
    },
  );

  // DELETE /cases/:id
  server.delete(
    "/cases/:id",
    { preHandler: [server.authenticate, server.authorize(["admin"])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { error } = await supabase
        .from("cases")
        .delete()
        .eq("id", id);
      if (error) throw new AppError(error.message, 500);
      return reply.code(204).send();
    },
  );
};

export default fp(adminCasesRoutes as any);
=======
const CasesParamsSchema = z.object({
  id: z.string().uuid(),
});

const adminCasesRoutes: FastifyPluginAsync = async (server) => {
  server.post(
    "/conversations/:id/cases",
    {
      schema: {
        body: CasesBodySchema,
        params: CasesParamsSchema,
      },
      preHandler: [server.authenticate, server.authorize(["admin"])],
    },
    async (request, reply) => {
      const { bot } = server.deps;
      const { id: conversation_id } = request.params as z.infer<
        typeof CasesParamsSchema
      >;
      const { title, summary, created_by } = request.body as z.infer<
        typeof CasesBodySchema
      >;

      const operatorAdminUrl = env.PUBLIC_URL?.replace("/admin", "/operator-admin") || 
                              "http://localhost:3000/operator-admin";
      const link = `${operatorAdminUrl}/conversations/${conversation_id}`;

      const { data, error } = await supabase
        .from("cases")
        .insert({ conversation_id, title, summary, link, created_by })
        .select()
        .single();

      if (error) {
        throw new AppError("DATABASE_ERROR", `Failed to create case: ${error.message}`, 500);
      }

      const notificationChatId = env.CASES_TELEGRAM_CHAT_ID;
      if (notificationChatId && bot?.telegram) {
        try {
          const message = `*Новый кейс: ${title}*\n\n${summary}\n\n[Открыть кейс](${link})`;
          await bot.telegram.sendMessage(notificationChatId, message, {
            parse_mode: "Markdown",
          });
        } catch (err) {
          request.log.error(
            { err },
            "Failed to send case creation notification to Telegram",
          );
          // Do not fail the request if the notification fails
        }
      }

      return reply.code(201).send(data);
    },
  );
};

export default fp(adminCasesRoutes);
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
