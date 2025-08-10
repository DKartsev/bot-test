import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import supabase from '../db';

export default async function adminSavedRepliesRoutes(server: FastifyInstance) {
  server.get('/saved-replies', async (request, reply) => {
    const querySchema = z.object({
      search: z.string().optional(),
      tag: z.string().optional(),
    });
    const { search, tag } = querySchema.parse(request.query);

    let query = supabase
      .from('saved_replies')
      .select('id, title, content, tags, updated_at, created_by')
      .order('updated_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;

    if (error) {
      reply.code(500).send({ error: error.message });
      return;
    }

    reply.send({ replies: data || [] });
  });

  server.post('/saved-replies', async (request, reply) => {
    const bodySchema = z.object({
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional().default([]),
      created_by: z.string().optional(),
    });
    const { title, content, tags, created_by } = bodySchema.parse(request.body);

    const { data, error } = await supabase
      .from('saved_replies')
      .insert({ title, content, tags, created_by })
      .select('id, title, content, tags, updated_at, created_by')
      .single();

    if (error || !data) {
      reply.code(500).send({ error: error?.message });
      return;
    }

    reply.send(data);
  });

  server.patch('/saved-replies/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const bodySchema = z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);
    const updates = { ...body, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('saved_replies')
      .update(updates)
      .eq('id', id)
      .select('id, title, content, tags, updated_at, created_by')
      .single();

    if (error || !data) {
      reply.code(500).send({ error: error?.message });
      return;
    }

    reply.send(data);
  });

  server.delete('/saved-replies/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const { id } = paramsSchema.parse(request.params);

    const { error } = await supabase
      .from('saved_replies')
      .delete()
      .eq('id', id);

    if (error) {
      reply.code(500).send({ error: error.message });
      return;
    }

    reply.send({ ok: true });
  });
}
