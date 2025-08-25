import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorLogger, requestLogger, logInfo, logError } from './utils/logger';
import { cacheService } from './services/cache';

// Импорт системы обработки ошибок
import {
  requestIdMiddleware,
  validationErrorHandler,
  authErrorHandler,
  errorHandlerMiddleware,
  notFoundHandler,
  unhandledErrorHandler,
  performanceMonitor,
} from './middleware/errorHandler';

// Импорт системы аутентификации
import { authMiddleware } from './middleware/auth';

// Импорт системы метрик
import {
  httpMetricsMiddleware,
  errorMetricsMiddleware,
  systemMetricsMiddleware,
  redisMetricsMiddleware,
} from './middleware/metricsMiddleware';
import { metricsCollector } from './services/metricsCollector';

// Импорт маршрутов
import operatorRoutes from './routes/operator';
import telegramRoutes from './routes/telegram';
import uploadRoutes from './routes/upload';
import rateLimitRoutes from './routes/rateLimit';
import queryOptimizerRoutes from './routes/queryOptimizer';
import errorHandlerRoutes from './routes/errorHandler';
import swaggerRoutes from './routes/swagger';
import metricsRoutes from './routes/metrics';
import ragRoutes from './routes/rag';

// Импорт WebSocket сервиса
import { WebSocketService } from './services/websocket';

const app = express();
const PORT = env.PORT || 3000;

// Настройки для Windows
process.env.LANG = 'en_US.UTF-8';
process.env.LC_ALL = 'en_US.UTF-8';

// CORS настройка из переменных окружения (должна быть первой!)
try {
  console.log('CORS Origin:', env.api.cors.origin);
  console.log('CORS Credentials:', env.api.cors.credentials);
  
  const corsOrigins = env.api.cors.origin.split(',').map(origin => origin.trim());
  console.log('CORS Origins:', corsOrigins);

  app.use(cors({
    origin: corsOrigins,
    credentials: env.api.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
  }));
  
  console.log('CORS middleware настроен успешно');
} catch (error) {
  console.error('Ошибка настройки CORS:', error);
  // Fallback CORS настройка
  app.use(cors({
    origin: ['http://localhost:3001', 'http://158.160.169.147:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
  }));
  console.log('Используется fallback CORS настройка');
}

// Базовые middleware
app.use(helmet());

// Система обработки ошибок
app.use(requestIdMiddleware);
app.use(performanceMonitor);
app.use(validationErrorHandler);
app.use(authErrorHandler);

// Система метрик (должна быть рано в цепочке middleware)
app.use(httpMetricsMiddleware);
app.use(systemMetricsMiddleware);
app.use(redisMetricsMiddleware);

// Логирование запросов
app.use(requestLogger);

// Morgan для HTTP логирования
app.use(morgan('combined'));

// Rate limiting - используем наш кастомный сервис
import { rateLimitMiddleware } from './services/rateLimiter';
app.use(rateLimitMiddleware.global());

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статические файлы
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', async (req, res) => {
  const redisStatus = cacheService.isConnected() ? 'connected' : 'disconnected';
  const redisInfo = cacheService.isConnected() ? await cacheService.getInfo() : null;
  const metricsStats = metricsCollector.getCollectorStats();
  const systemMetrics = metricsCollector.getSystemMetrics();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    redis: {
      status: redisStatus,
      info: redisInfo ? {
        connected_clients: redisInfo['connected_clients'],
        used_memory: redisInfo['used_memory_human'],
        total_commands_processed: redisInfo['total_commands_processed'],
      } : null,
    },
    metrics: {
      totalMetrics: metricsStats.totalMetrics,
      totalCounters: metricsStats.totalCounters,
      totalGauges: metricsStats.totalGauges,
      totalHistograms: metricsStats.totalHistograms,
      memoryUsage: metricsStats.memoryUsage,
    },
    system: {
      memoryUsage: Math.round(systemMetrics.memory.usage),
      nodeVersion: systemMetrics.nodeVersion,
      platform: systemMetrics.platform,
    },
  });
});

// API маршруты
app.use('/api', authMiddleware, operatorRoutes);

// Временный отладочный эндпоинт для получения JWT токена (только для разработки)
if (env.NODE_ENV === 'development') {
  app.get('/debug-token', (req, res) => {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-minimum-required';
      const testPayload = { id: 1, email: 'test@operator.com', role: 'admin', type: 'operator' };
      const token = require('jsonwebtoken').sign(testPayload, JWT_SECRET, { expiresIn: '1h' });
      
      res.json({
        success: true,
        data: {
          process_env_jwt_secret: process.env.JWT_SECRET,
          used_jwt_secret: JWT_SECRET,
          node_env: env.NODE_ENV,
          test_token: token,
          test_payload: testPayload
        }
      });
    } catch (error) {
      console.error('Ошибка генерации токена:', error);
      res.status(500).json({ success: false, error: 'Не удалось сгенерировать токен' });
    }
  });
}
app.use('/telegram', telegramRoutes);
app.use('/upload', uploadRoutes);
app.use('/rate-limit', rateLimitRoutes);
app.use('/query-optimizer', queryOptimizerRoutes);
app.use('/error-handler', errorHandlerRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/rag', ragRoutes);

// Swagger документация
app.use('/docs', swaggerRoutes);

// Инициализация сервисов
async function initializeServices(): Promise<void> {
  try {
    // Подключаемся к Redis
    await cacheService.connect();
    logInfo('✅ Redis подключен');
  } catch (error) {
    logError('❌ Ошибка подключения к Redis:', error);
    logInfo('⚠️ Сервер продолжит работу без Redis кэширования');
  }
}

// WebSocket endpoint
const server = app.listen(PORT, async () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 WebSocket доступен на ws://localhost:${PORT}/ws`);
  console.log(`🔗 API доступен на http://localhost:${PORT}/api`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/docs`);
  console.log(`📈 Метрики: http://localhost:${PORT}/api/metrics`);

  if (env.NODE_ENV === 'development') {
    console.log('🔧 Режим разработки');
  }

  // Инициализируем сервисы
  await initializeServices();
});

// Инициализация WebSocket
const wsService = new WebSocketService(server);

// Система обработки ошибок
app.use(errorMetricsMiddleware);
app.use(errorHandlerMiddleware);
app.use(notFoundHandler);

// Обработка необработанных ошибок
app.use(unhandledErrorHandler);

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\nПолучен ${signal}, завершаем работу...`);

  server.close(async () => {
    console.log('HTTP сервер остановлен');

    // Закрываем WebSocket соединения
    if (wsService) {
      wsService.cleanup();
    }

    // Останавливаем сборщик метрик
    try {
      metricsCollector.stop();
      console.log('Сборщик метрик остановлен');
    } catch (error) {
      console.error('Ошибка остановки сборщика метрик:', error);
    }

    // Отключаемся от Redis
    try {
      await cacheService.disconnect();
      console.log('Redis отключен');
    } catch (error) {
      console.error('Ошибка отключения Redis:', error);
    }

    process.exit(0);
  });

  // Принудительное завершение через 10 секунд
  setTimeout(() => {
    console.error('Принудительное завершение процесса');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('uncaughtException', (err: Error) => {
  console.error('Необработанная ошибка:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, _promise: Promise<unknown>) => {
  console.error('Необработанное отклонение промиса:', reason);
  process.exit(1);
});

export default app;
