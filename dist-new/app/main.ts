import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { buildServer } from './http/server.js';
import { QAService } from './app/qa/QAService.js';
import { makeBot } from './bot/bot.js';
import { appEventBus } from './app/events.js';
import { PgUserRepo } from './modules/users/infra/PgUserRepo.js';

async function main() {
  logger.info('🚀 Запуск приложения...');

  try {
    // 1. Создаем инстанс QAService
    const qaService = new QAService();

    // 2. Создаем инстанс бота, передавая ему сервисы
    const { bot } = makeBot({ qaService });

    // 3. Создаем инстанс сервера, передавая ему все зависимости
    const server = await buildServer({
      qaService,
      bot,
      eventBus: appEventBus,
      // Временная реализация, будет заменена после создания сервера
      userRepo: {
        async findByEmail(_email: string): Promise<{ id: string; email: string; name: string } | null> {
          return null;
        },
        async create(data: { email: string; name: string }): Promise<{ id: string; email: string; name: string }> {
          return { id: '', ...data };
        },
        async list(_opts: { limit: number; cursor?: string }): Promise<{ items: { id: string; email: string; name: string }[] }> {
          return { items: [] };
        },
      },
    });

    // 4. Создаем userRepo после создания сервера
    const userRepo = new PgUserRepo(server);
    server.deps.userRepo = userRepo;

    // 5. Запускаем сервер
    await (server as unknown as { listen: (opts: { port: number; host: string }) => Promise<void> }).listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`🚀 Сервер запущен на порту ${env.PORT}`);
    logger.info('🤖 Бот запущен');
  } catch (err) {
    logger.error({ err }, 'Application failed to start');
    process.exit(1);
  }
}

void main();
