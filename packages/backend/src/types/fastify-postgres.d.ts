import "fastify";
import type { Pool, PoolClient, QueryResultRow } from "pg";

declare module "fastify" {
  interface FastifyInstance {
    pg: {
      pool: Pool;
      connect(): Promise<PoolClient>;
      query<T extends QueryResultRow = QueryResultRow>(
        query: string,
        values?: unknown[],
      ): Promise<{ rows: T[] }>;
    };
  }
}
