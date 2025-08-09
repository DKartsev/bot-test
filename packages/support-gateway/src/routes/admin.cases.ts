import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import supabase from '../db';
import bot from '../bot';

export default async function adminCasesRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.verifyOperatorAuth);

  server.post('/conversations/:id/cases', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const bodySchema = z.object({
      title: z.string(),
      summary: z.string(),
      created_by: z.string().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { title, summary, created_by } = bodySchema.parse(request.body);

    const link = `${process.env.OP_ADMIN_BASE_URL}/conversations/${id}`;

    const { data, error } = await supabase
      .from('cases')
      .insert({ conversation_id: id, title, summary, link, created_by })
      .select(
        'id, conversation_id, title, summary, link, created_by, created_at'
      )
      .single();

    if (error || !data) {
      reply.code(500).send({ error: error?.message });
      return;
    }

    const chatId = process.env.CASES_TELEGRAM_CHAT_ID;
    if (chatId) {
      try {
        await bot.telegram.sendMessage(
          chatId,
          `*${title}*\n${summary}\n${link}`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        server.log.error({ err }, 'Failed to send case to Telegram');
      }
    }

    reply.send(data);
  });
}
