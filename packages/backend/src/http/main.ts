// Load environment variables from `.env` in non-production environments.
// This dynamic import avoids bundling dev-only dependencies in production.
if (process.env.NODE_ENV !== "production") {
  await import("./loadEnv.js");
}

import { Pool } from "pg";
import { buildServer } from "./server.js";
import { PgUserRepo } from "../modules/users/infra/PgUserRepo.js";

// ---------- чтение окружения ----------
const PORT = Number(process.env.PORT ?? 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const ENCRYPTION_KEY_BASE64 = process.env.ENCRYPTION_KEY_BASE64;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
if (!ENCRYPTION_KEY_BASE64) {
  throw new Error("ENCRYPTION_KEY_BASE64 is required");
}

// ---------- инфраструктура ----------
const pool = new Pool({ connectionString: DATABASE_URL });
const userRepo = new PgUserRepo(pool);

// ---------- запуск HTTP ----------
const app = await buildServer({ userRepo });

app.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
