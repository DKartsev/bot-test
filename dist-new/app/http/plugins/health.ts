import type { FastifyPluginAsync } from 'fastify';

const healthPlugin: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.get('/health', async (request: any, reply: any) => {
    try {
      const hasPg = fastify.pg && typeof fastify.pg?.query === 'function';
      if (hasPg) {
        await fastify.pg.query('SELECT 1');
        return { status: 'ok', checks: { database: 'ok' } };
      }
      // If pg plugin is not registered, still return ok (service is up)
      return { status: 'ok', checks: { database: 'skipped' } };
    } catch (err) {
      request.log.error({ err }, '❌ Проверка здоровья сервера не пройдена');
      return reply
        .code(503)
        .send({ status: 'error', checks: { database: 'error' } });
    }
  });

  return;
};

export default healthPlugin;

