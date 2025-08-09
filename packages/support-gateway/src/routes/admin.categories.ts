import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import supabase from '../db';

export default async function adminCategoriesRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.verifyOperatorAuth);

  server.get('/categories', async (_req, reply) => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, color')
      .order('name');
    if (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
    reply.send(data);
  });

  server.post('/categories', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string(),
      color: z.string().default('#4f46e5'),
    });
    const payload = bodySchema.parse(request.body);

    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
      .select('id, name, color')
      .single();

    if (error || !data) {
      reply.code(500).send({ error: error?.message });
      return;
    }
    reply.send(data);
  });

  server.patch('/categories/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const bodySchema = z
      .object({ name: z.string().optional(), color: z.string().optional() })
      .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

    const { id } = paramsSchema.parse(request.params);
    const payload = bodySchema.parse(request.body);

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select('id, name, color')
      .single();

    if (error || !data) {
      reply.code(500).send({ error: error?.message });
      return;
    }
    reply.send(data);
  });

  server.delete('/categories/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string() });
    const { id } = paramsSchema.parse(request.params);

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      reply.code(500).send({ error: error.message });
      return;
    }
    reply.send({ ok: true });
  });
}
