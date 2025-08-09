import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import supabase from '../db';

export default async function adminNotesRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.verifyOperatorAuth);

  server.get('/conversations/:id/notes', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const { id } = paramsSchema.parse(request.params);

    const { data, error } = await supabase
      .from('operator_notes')
      .select('id, conversation_id, message_id, author_name, content, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      reply.code(500).send({ error: error.message });
      return;
    }

    reply.send({ notes: data || [] });
  });

  server.post('/conversations/:id/notes', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const bodySchema = z.object({
      content: z.string(),
      message_id: z.string().optional(),
      author_name: z.string(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { content, message_id, author_name } = bodySchema.parse(request.body);

    const { data, error } = await supabase
      .from('operator_notes')
      .insert({ conversation_id: id, content, message_id, author_name })
      .select('id, conversation_id, message_id, author_name, content, created_at')
      .single();

    if (error || !data) {
      reply.code(500).send({ error: error?.message });
      return;
    }

    reply.send(data);
  });

  server.delete('/notes/:noteId', async (request, reply) => {
    const paramsSchema = z.object({ noteId: z.string() });
    const { noteId } = paramsSchema.parse(request.params);

    const { error } = await supabase
      .from('operator_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      reply.code(500).send({ error: error.message });
      return;
    }

    reply.send({ ok: true });
  });
}
