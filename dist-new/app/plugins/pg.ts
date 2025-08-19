import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { PoolClient } from 'pg';
import { Pool } from 'pg';

const pgPlugin: FastifyPluginAsync = async (fastify, _opts) => {
  const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/bot_test';
  const maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS ?? '10', 10);
  const idleTimeoutMillis = parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10);

  const pool = new Pool({
    connectionString,
    max: maxConnections,
    idleTimeoutMillis,
  });

  pool.on('connect', (client) => {
    client.query('set statement_timeout = 15000').catch(() => {
      // ignore
    });
    client
      .query('set idle_in_transaction_session_timeout = 15000')
      .catch(() => {
        // ignore
      });
  });

  pool.on('error', (err) => {
    fastify.log.error({ err }, 'pg pool error');
  });

  fastify.decorate('pg', {
    pool,
    async connect(): Promise<PoolClient> {
      return pool.connect();
    },
    async query<T = unknown>(q: string, values?: unknown[]): Promise<{ rows: T[] }> {
      const res = await pool.query(q, values);
      return { rows: res.rows as T[] };
    },
  });

  fastify.addHook('onClose', async () => {
    await pool.end().catch(() => undefined);
  });
  return;
};

export default fp(pgPlugin);
