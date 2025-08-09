require('dotenv').config();
const { logger } = require('../utils/logger');
const app = require('./index');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(
    `Server listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`
  );
});

const shutdown = (signal) => {
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
