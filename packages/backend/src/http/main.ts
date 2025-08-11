import { preloadEnv } from "../config/dotenv.js";
import type { FastifyReply, FastifyRequest } from "fastify";

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

// ---- Health/Root routes for Render ----
app.head("/", async (_req: FastifyRequest, reply: FastifyReply) => {
  reply.code(200).send();
});

app.get("/", async (_req: FastifyRequest, reply: FastifyReply) => {
  reply
    .type("application/json")
    .send({
      status: "ok",
      env: (process.env.NODE_ENV ?? "production"),
      uptime: process.uptime(),
      now: new Date().toISOString(),
    });
});
// ---------------------------------------

await app.listen({ port: PORT, host: "0.0.0.0" });
