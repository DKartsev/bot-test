import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { supabase } from "../../../infra/db/connection.js";
import { env } from "../../../config/env.js";
import { AppError } from "../../utils/errorHandler.js";

const CasesBodySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  created_by: z.string().optional(),
});

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
