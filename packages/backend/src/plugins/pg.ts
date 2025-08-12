import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

const pgPlugin: FastifyPluginAsync = async (app) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.decorate("pg", {
    pool,
    async connect(): Promise<PoolClient> {
      return pool.connect();
    },
    async query<T extends QueryResultRow = QueryResultRow>(
      q: string,
      values?: any[],
    ): Promise<{ rows: T[] }> {
      const res: QueryResult<T> = await pool.query<T>(q, values);
      return { rows: res.rows as T[] };
    },
  });

  app.addHook("onClose", async () => {
    await pool.end().catch(() => undefined);
  });
};

export default fp(pgPlugin as any);
