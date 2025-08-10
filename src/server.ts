import { env } from './config/environment';
import { logger } from './utils/logger';
import adminApp from './api/adminV2';

async function startServer() {
  try {
    const server = adminApp.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT} (NODE_ENV=${env.NODE_ENV})`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, closing server`);
      const timeout = setTimeout(() => {
        logger.error('Force exiting after timeout');
        process.exit(1);
      }, 8000);

      server.close((err) => {
        clearTimeout(timeout);
        if (err) {
          logger.error({ err }, 'Error during shutdown');
          process.exit(1);
        }
        logger.info('Server closed gracefully');
        process.exit(0);
      });
    };

    ['SIGINT', 'SIGTERM'].forEach((sig) => {
      process.on(sig, () => shutdown(sig));
    });

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();