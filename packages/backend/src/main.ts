import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { buildServer } from "./http/server.js";
import { QAService } from "./app/qa/QAService.js";
import { makeBot } from "./bot/bot.js";
import { appEventBus } from "./app/events.js";

async function main() {
  logger.info("Запуск приложения...");

  // 1. Инициализируем сервисы
  const qaService = new QAService();
  await qaService.init();

  // 2. Создаем инстанс бота, передавая ему сервисы
  const { bot } = makeBot({ qaService });

  // 3. Создаем инстанс сервера, передавая ему все зависимости
  const server = await buildServer({
    qaService,
    bot,
    eventBus: appEventBus,
  });

  // 4. Запускаем сервер
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

main();
