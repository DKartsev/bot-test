import { preloadEnv } from "../config/dotenv.js";

// 1) Сначала подгружаем .env в dev/test (в production — noop)
await preloadEnv();

// 2) Теперь динамически импортируем остальной код,
// чтобы он выполнялся уже после загрузки env.
const { getEnv } = await import("./loadEnv.js");
const { buildServer } = await import("./server.js");
const { Pool } = await import("pg");
const { PgUserRepo } = await import("../modules/users/infra/PgUserRepo.js");

// 3) Читаем окружение (с валидацией)
const env = getEnv();
const PORT = Number(process.env.PORT ?? 3000);
const pool = new Pool({ connectionString: env.DATABASE_URL });
const userRepo = new PgUserRepo(pool);

// 4) Запуск сервера
const app = await buildServer({ userRepo });
await app.listen({ port: PORT, host: "0.0.0.0" });
