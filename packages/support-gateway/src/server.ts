import Fastify from 'fastify';
import { config } from 'dotenv';
import { z } from 'zod';
import logger from './utils/logger';
import bot from './bot';
import { generateResponse } from './services/ragService';
import adminRoutes from './routes/admin.conversations';
import adminStreamRoutes from './routes/admin.stream';
import adminNotesRoutes from './routes/admin.notes';
import adminSavedRepliesRoutes from './routes/admin.saved-replies';
import verifyOperatorAuth from './config/auth';

config();

const envSchema = z.object({
  PORT: z.string().transform(Number).default('3000')
});

async function buildServer() {
  const server = Fastify({ logger: logger as any });

  await server.register(verifyOperatorAuth);
  await server.register(adminRoutes, { prefix: '/admin' });
  await server.register(adminNotesRoutes, { prefix: '/admin' });
  await server.register(adminSavedRepliesRoutes, { prefix: '/admin' });
  await server.register(adminStreamRoutes);

  server.get('/healthz', async () => ({ ok: true }));

  server.post('/webhook', async (request, reply) => {
    try {
      await bot.handleUpdate(request.body as any);
      reply.send({ ok: true });
    } catch (err) {
      logger.error({ err }, 'Webhook handling failed');
      reply.code(500).send({ ok: false });
    }
  });

  server.post('/api/message', async (request, reply) => {
    const bodySchema = z.object({ message: z.string() });
    try {
      const { message } = bodySchema.parse(request.body);
      const response = await generateResponse(message);
      reply.send({ response });
    } catch (err) {
      logger.error({ err }, 'API error');
      reply.code(400).send({ error: 'Invalid request' });
    }
  });

  return server;
}

(async () => {
  try {
    const { PORT } = envSchema.parse(process.env);
    const server = await buildServer();
    await server.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Server running on port ${PORT}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
  }
})();
