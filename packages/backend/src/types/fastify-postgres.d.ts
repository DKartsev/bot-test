import "fastify";
import type { Pool, PoolClient } from "pg";

declare module "fastify" {
	interface FastifyInstance {
		pg: {
			pool: Pool;
			connect(): Promise<PoolClient>;
			query<T = any>(query: string, values?: any[]): Promise<{ rows: T[] }>;
		};
	}
}
