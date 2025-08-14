import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { readFileSync } from "node:fs";

function buildSSL(): false | { rejectUnauthorized?: boolean; ca?: string } {
  const sslMode = (process.env.PGSSLMODE || "").toLowerCase(); // require | no-verify | disable | ""
  const rejEnv = (
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || ""
  ).toLowerCase(); // "1"/"0"/"true"/"false"
  const caPath = process.env.PGSSLROOTCERT;

  let ca: string | undefined;
  if (caPath) {
    try {
      ca = readFileSync(caPath, "utf8");
    } catch {
      // ignore
    }
  }

  // detect Supabase
  let host = "";
  try {
    host = new URL(process.env.DATABASE_URL || "").hostname || "";
  } catch {
    // ignore
  }
  const isSupabase = /\.supabase\.com$/.test(host);

  if (sslMode === "disable") return false;

  let explicitReject: boolean | undefined;
  if (rejEnv === "1" || rejEnv === "true") explicitReject = true;
  if (rejEnv === "0" || rejEnv === "false") explicitReject = false;

  const noVerify =
    sslMode === "no-verify" ||
    (!sslMode && (isSupabase || !!process.env.RENDER));

  const ssl: { rejectUnauthorized?: boolean; ca?: string } = {};
  if (ca) {
    ssl.ca = ca;
    ssl.rejectUnauthorized = explicitReject ?? true;
  } else {
    ssl.rejectUnauthorized = explicitReject ?? !noVerify;
  }
  return ssl;
}

const pgPlugin: FastifyPluginAsync = async (app) => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
      app.log.warn(
        "DATABASE_URL is not set; pg pool will be created with undefined connectionString",
      );
    }

    const ssl = buildSSL();
    const pool = new Pool({
      connectionString,
      ssl,
      max: Number(process.env.PGPOOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000),
      connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS ?? 10_000),
    });

    pool.on("connect", (client) => {
      client.query("set statement_timeout = 15000").catch(() => {
        // ignore
      });
      client
        .query("set idle_in_transaction_session_timeout = 15000")
        .catch(() => {
          // ignore
        });
    });

    pool.on("error", (err) => {
      app.log.error({ err }, "pg pool error");
    });

    app.decorate("pg", {
      pool,
      async connect(): Promise<PoolClient> {
        return pool.connect();
      },
      async query<T = any>(
        q: string,
        values?: (string | number | boolean | null | Date | Buffer)[],
      ): Promise<{ rows: T[] }> {
        const res = await pool.query(q, values);
        return { rows: res.rows as T[] };
      },
    });

    app.addHook("onClose", async () => {
      await pool.end().catch(() => undefined);
    });
  };

export default fp(pgPlugin as any);
