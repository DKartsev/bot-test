import 'dotenv-safe/config.js';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { PgUserRepo } from './modules/users/infra/PgUserRepo.js';
import { Pool } from 'pg';

const env = loadEnv();
const pool = new Pool({ connectionString: env.DATABASE_URL });
const app = createApp({ userRepo: new PgUserRepo(pool) });

const port = env.PORT ?? 3000;
app.listen(port, () => console.log(`API on :${port}`));
