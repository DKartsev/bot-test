import winston from 'winston';
import path from 'path';

// Создаем форматтер для логов
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${String(timestamp)} [${String(level).toUpperCase()}]: ${String(message)}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\n${String(stack)}`;
    }

    return log;
  }),
);

// Создаем логгер
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'support-backend' },
  transports: [
    // Консольный транспорт для разработки
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),

    // Файловый транспорт для ошибок
    new winston.transports.File({
      filename: path.join(String(process.cwd()), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Файловый транспорт для всех логов
    new winston.transports.File({
      filename: path.join(String(process.cwd()), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Создаем директорию для логов если её нет
import fs from 'fs';
const logsDir = path.join(String(process.cwd()), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Создаем специальные методы для разных типов ошибок
export const logError = (error: Error | string, context?: any) => {
  if (error instanceof Error) {
    logger.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
    });
  } else {
    logger.error(error, { context });
  }
};

export const logWarning = (message: string, context?: any) => {
  logger.warn(message, { context });
};

export const logInfo = (message: string, context?: any) => {
  logger.info(message, { context });
};

export const logDebug = (message: string, context?: any) => {
  logger.debug(message, { context });
};

// Создаем middleware для логирования HTTP запросов
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  });

  next();
};

// Создаем middleware для логирования ошибок
export const errorLogger = (error: Error, req: any, res: any, next: any) => {
  logError(error, {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user,
  });

  next(error);
};

// Экспортируем основной логгер
export default logger;
