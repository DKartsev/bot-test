import "dotenv-safe/config.js";
import { buildServer } from "./server.js";
import { loadEnv } from "../config/env.js";
import { PgUserRepo } from "../modules/users/infra/PgUserRepo.js";
import { Pool } from "pg";
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

async function main() {
  const env = loadEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const app = await buildServer({ userRepo: new PgUserRepo(pool) });
  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: "0.0.0.0" });
  const shutdown = async () => {
    app.log.info("graceful shutdown");
    await app.close();
    try {
      await pool.end();
    } catch {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
