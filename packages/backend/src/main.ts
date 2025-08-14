import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { buildServer } from "./http/server.js";
import { QAService } from "./app/qa/QAService.js";
import { makeBot } from "./bot/bot.js";
import { appEventBus } from "./app/events.js";
import { PgUserRepo } from "./modules/users/infra/PgUserRepo.js";
<<<<<<< HEAD
=======
import { Pool } from "pg";
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1

async function main() {
  logger.info("Запуск приложения...");

  // 0. Initialize database connection
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // 1. Инициализируем сервисы
  const qaService = new QAService();
  await qaService.init();

  // 2. Создаем инстанс бота, передавая ему сервисы
  const { bot } = makeBot({ qaService });

  // 3. Создаем репозитории
  const userRepo = new PgUserRepo(pool);

  // 4. Создаем инстанс сервера, передавая ему все зависимости
  const server = await buildServer({
    qaService,
    bot,
    eventBus: appEventBus,
<<<<<<< HEAD
    userRepo: null as any, // Временно null, будет заменен после регистрации плагинов
  });

  // 4. Создаем userRepo после создания сервера
  const userRepo = new PgUserRepo(server);
  server.deps.userRepo = userRepo;

=======
    userRepo,
  });

>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
  // 5. Запускаем сервер
  try {
    await server.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

void main();
