import 'dotenv-safe/config.js';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { PgUserRepo } from './modules/users/infra/PgUserRepo.js';
import { Pool } from 'pg';

const env = loadEnv();
const pool = new Pool({ connectionString: env.DATABASE_URL });
const app = createApp({
  userRepo: new PgUserRepo(pool),
  health: { db: async () => pool.query('select 1').then(() => true).catch(() => false) }
});

const port = env.PORT ?? 3000;
const server = app.listen(port, () => console.log(`API on :${port}`));

const shutdown = async () => {
  console.log('graceful shutdown...');
  server.closeAllConnections?.();
  server.close(() => console.log('http closed'));
  try { await pool.end?.(); } catch {}
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
