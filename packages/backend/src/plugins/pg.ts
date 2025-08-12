import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

const pgPlugin: FastifyPluginAsync = async (app) => {
  const connectionString = process.env.DATABASE_URL;
  const url = connectionString ? new URL(connectionString) : undefined;
  const isSupabase = url ? url.hostname.endsWith(".supabase.com") : false;
  const sslMode = (
    process.env.PGSSLMODE || (isSupabase ? "require" : "disable")
  ).toLowerCase();
  const ssl =
    sslMode === "disable"
      ? false
      : { rejectUnauthorized: sslMode !== "no-verify" };

  const pool = new Pool({
    connectionString,
    ssl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("connect", (client) => {
    client
      .query("set statement_timeout=15000")
      .catch((err) => app.log.error({ err }, "statement_timeout set failed"));
    client
      .query("set idle_in_transaction_session_timeout=15000")
      .catch((err) =>
        app.log.error(
          { err },
          "idle_in_transaction_session_timeout set failed",
        ),
      );
  });

  pool.on("error", (err) => {
    app.log.error({ err }, "pg pool error");
  });

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
