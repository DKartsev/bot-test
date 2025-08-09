import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import supabase from '../db';
import bot from '../bot';
import { liveBus } from '../lib/liveBus';

export default async function adminConversationsRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.verifyOperatorAuth);

  server.get('/me', async (_req, reply) => {
    reply.send({ ok: true });
  });

  server.get('/conversations', async (request, reply) => {
    const querySchema = z.object({
      status: z.enum(['open', 'closed']).optional(),
      handoff: z.enum(['human', 'bot']).optional(),
      limit: z.coerce.number().default(20),
      cursor: z.string().optional(),
    });

    const { status, handoff, limit, cursor } = querySchema.parse(request.query);

    let q = supabase
      .from('conversations')
      .select('id, user_telegram_id, status, handoff, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (status) q = q.eq('status', status);
    if (handoff) q = q.eq('handoff', handoff);
    if (cursor) q = q.lt('updated_at', cursor);

    const { data, error } = await q;

    if (error) {
      reply.code(500).send({ error: error.message });
      return;
    }

    const conversations = await Promise.all(
      (data || []).map(async (conv) => {
        const { data: last } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        return {
          ...conv,
          last_message_preview: last?.content ?? null,
        };
      })
    );

    reply.send({ conversations });
  });

  server.get('/conversations/:id/messages', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const querySchema = z.object({
      limit: z.coerce.number().default(50),
      cursor: z.string().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { limit, cursor } = querySchema.parse(request.query);

    let q = supabase
      .from('messages')
      .select('id, sender, content, media_urls, media_types, transcript, vision_summary, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (cursor) q = q.gt('created_at', cursor);

    const { data, error } = await q;

    if (error) {
      reply.code(500).send({ error: error.message });
      return;
    }

    reply.send({ messages: data || [] });
  });

  server.post('/conversations/:id/reply', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const bodySchema = z.object({ text: z.string() });

    const { id } = paramsSchema.parse(request.params);
    const { text } = bodySchema.parse(request.body);

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('user_telegram_id')
      .eq('id', id)
      .single();

    if (convErr || !conv) {
      reply.code(404).send({ error: 'conversation_not_found' });
      return;
    }

    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender: 'operator', content: text })
      .select('id, sender, content, media_urls, media_types, transcript, vision_summary, created_at')
      .single();

    if (msgErr || !message) {
      reply.code(500).send({ error: msgErr?.message });
      return;
    }

    try {
      await bot.telegram.sendMessage(conv.user_telegram_id, text);
    } catch (err) {
      reply.code(500).send({ error: 'telegram_error' });
      return;
    }

    liveBus.emit('operator_reply', { conversation_id: Number(id), message_id: message.id });

    reply.send(message);
  });

  server.get('/conversations/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const { id } = paramsSchema.parse(request.params);

    const { data, error } = await supabase
      .from('conversations')
      .select('id, user_telegram_id, status, handoff, updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      reply.code(404).send({ error: error?.message });
      return;
    }

    reply.send(data);
  });

  server.patch('/conversations/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const bodySchema = z
      .object({
        status: z.enum(['open', 'closed']).optional(),
        handoff: z.enum(['bot', 'human']).optional(),
        assignee_id: z.string().nullable().optional(),
      })
      .refine((data) => Object.keys(data).length > 0, {
        message: 'No fields to update',
      });

    const { id } = paramsSchema.parse(request.params);
    const payload = bodySchema.parse(request.body);

    const { data, error } = await supabase
      .from('conversations')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      reply.code(500).send({ error: error?.message });
      return;
    }

    if (payload.handoff) {
      liveBus.emit('handoff', {
        conversation_id: Number(id),
        handoff: data.handoff,
      });
    }

    reply.send(data);
  });
}
