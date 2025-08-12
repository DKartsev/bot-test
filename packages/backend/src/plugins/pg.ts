import fp from "fastify-plugin";
import { Pool } from "pg";
import type { FastifyPluginAsync } from "fastify";

const pgPlugin: FastifyPluginAsync = fp(async (app) => {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  app.decorate("pg", pool);
  app.addHook("onClose", async () => {
    await pool.end();
  });
});

export default pgPlugin;
