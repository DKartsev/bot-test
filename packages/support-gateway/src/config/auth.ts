import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'verifyOperatorAuth',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = request.headers['authorization'];
      let token = auth?.split(' ')[1];

      if (!token) {
        const q = request.query as Record<string, string | undefined>;
        token = q?.token;
      }

      if (token !== process.env.OPERATOR_API_TOKEN) {
        reply.code(401).send({ error: 'unauthorized' });
      }
    }
  );
};

export default fp(plugin);

declare module 'fastify' {
  interface FastifyInstance {
    verifyOperatorAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
