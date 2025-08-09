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
      category_id: z.string().optional(),
      assignee_name: z.string().optional(),
      limit: z.coerce.number().default(20),
      cursor: z.string().optional(),
    });

    const { status, handoff, category_id, assignee_name, limit, cursor } =
      querySchema.parse(request.query);

    let q = supabase
      .from('conversations')
      .select(
        'id, user_telegram_id, status, handoff, assignee_name, assigned_at, updated_at, category:categories(id, name, color)'
      )
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (status) q = q.eq('status', status);
    if (handoff) q = q.eq('handoff', handoff);
    if (category_id) q = q.eq('category_id', category_id);
    if (assignee_name) q = q.eq('assignee_name', assignee_name);
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
      const bodySchema = z.object({ text: z.string(), author_name: z.string() });
      const querySchema = z.object({ force: z.coerce.boolean().optional() });

      const { id } = paramsSchema.parse(request.params);
      const { text, author_name } = bodySchema.parse(request.body);
      const { force } = querySchema.parse(request.query);

      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('user_telegram_id, assignee_name')
        .eq('id', id)
        .single();

      if (convErr || !conv) {
        reply.code(404).send({ error: 'conversation_not_found' });
        return;
      }

      if (!force && conv.assignee_name !== author_name) {
        reply.code(409).send({ error: 'not_assigned' });
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

      liveBus.emit('operator_reply', {
        conversation_id: Number(id),
        message_id: message.id,
      });

      reply.send(message);
    });

    server.post('/conversations/:id/attachments', async (request, reply) => {
      const paramsSchema = z.object({ id: z.string() });
      const querySchema = z.object({
        author_name: z.string(),
        force: z.coerce.boolean().optional(),
      });
      const { id } = paramsSchema.parse(request.params);
      const { author_name, force } = querySchema.parse(request.query);

      const file = await (request as any).file();
      if (!file) {
        reply.code(400).send({ error: 'file_required' });
        return;
      }

      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('user_telegram_id, assignee_name')
        .eq('id', id)
        .single();

      if (convErr || !conv) {
        reply.code(404).send({ error: 'conversation_not_found' });
        return;
      }

      if (!force && conv.assignee_name !== author_name) {
        reply.code(409).send({ error: 'not_assigned' });
        return;
      }

      const buffer = await file.toBuffer();
      const mime = file.mimetype;
      let method: 'sendPhoto' | 'sendVideo' | 'sendDocument';
      let mediaType: 'photo' | 'video' | 'document';
      if (mime.startsWith('image/')) {
        method = 'sendPhoto';
        mediaType = 'photo';
      } else if (mime.startsWith('video/')) {
        method = 'sendVideo';
        mediaType = 'video';
      } else {
        method = 'sendDocument';
        mediaType = 'document';
      }

    let tgMessage: any;
    try {
      tgMessage = await (bot.telegram as any)[method](conv.user_telegram_id, {
        source: buffer,
        filename: file.filename,
      });
    } catch (err) {
      reply.code(500).send({ error: 'telegram_error' });
      return;
    }

    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender: 'operator',
        media_urls: [`tg://${tgMessage.message_id}`],
        media_types: [mediaType],
        content: null,
      })
      .select(
        'id, sender, content, media_urls, media_types, transcript, vision_summary, created_at'
      )
      .single();

    if (msgErr || !message) {
      reply.code(500).send({ error: msgErr?.message });
      return;
    }

    liveBus.emit('operator_reply', {
      conversation_id: Number(id),
      message_id: message.id,
    });

      reply.send(message);
    });

    server.post('/conversations/:id/claim', async (request, reply) => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({ assignee_name: z.string() });
      const { id } = paramsSchema.parse(request.params);
      const { assignee_name } = bodySchema.parse(request.body);

      const { data: conv, error } = await supabase
        .from('conversations')
        .select('assignee_name')
        .eq('id', id)
        .single();

      if (error || !conv) {
        reply.code(404).send({ error: 'conversation_not_found' });
        return;
      }

      if (conv.assignee_name) {
        reply
          .code(409)
          .send({ error: 'assigned', assignee_name: conv.assignee_name });
        return;
      }

      const { data: updated, error: updErr } = await supabase
        .from('conversations')
        .update({
          assignee_name,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('assignee_name, assigned_at')
        .single();

      if (updErr) {
        reply.code(500).send({ error: updErr.message });
        return;
      }

      liveBus.emit('assigned', {
        conversation_id: Number(id),
        assignee_name,
      });

      reply.send(updated);
    });

    server.post('/conversations/:id/takeover', async (request, reply) => {
      const paramsSchema = z.object({ id: z.string() });
      const bodySchema = z.object({ assignee_name: z.string() });
      const { id } = paramsSchema.parse(request.params);
      const { assignee_name } = bodySchema.parse(request.body);

      const { error: updErr } = await supabase
        .from('conversations')
        .update({
          assignee_name,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updErr) {
        reply.code(500).send({ error: updErr.message });
        return;
      }

      liveBus.emit('assigned', {
        conversation_id: Number(id),
        assignee_name,
      });

      reply.send({ ok: true });
    });

  server.get('/conversations/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const { id } = paramsSchema.parse(request.params);

      const { data, error } = await supabase
        .from('conversations')
        .select(
          'id, user_telegram_id, status, handoff, assignee_name, assigned_at, updated_at, category:categories(id, name, color)'
        )
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
        category_id: z.string().nullable().optional(),
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
      .select(
        'id, user_telegram_id, status, handoff, updated_at, category:categories(id, name, color)'
      )
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
