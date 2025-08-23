import { Request, Response, NextFunction } from 'express';
import { metricsCollector } from '../services/metricsCollector';
import { logInfo, logError } from '../utils/logger';

/**
 * Расширение интерфейса Request для метрик
 */
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      requestId?: string;
    }
  }
}

/**
 * Middleware для сбора метрик HTTP запросов
 */
export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Записываем время начала запроса
    req.startTime = Date.now();

    // Увеличиваем счетчик общих запросов
    metricsCollector.incrementCounter('http_requests_total', {
      method: req.method,
      path: req.route?.path || req.path,
      user_agent: req.get('User-Agent') || 'unknown',
    });

    // Отслеживаем активные запросы
    metricsCollector.setGauge('http_requests_active', getActiveRequestsCount() + 1);

    // Перехватываем завершение ответа
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    let responseFinished = false;

    const finishRequest = () => {
      if (responseFinished) return;
      responseFinished = true;

      try {
        const endTime = Date.now();
        const duration = endTime - (req.startTime || endTime);
        const statusCode = res.statusCode.toString();

        // Метрики времени ответа
        metricsCollector.addToHistogram('http_request_duration_ms', duration, {
          method: req.method,
          path: req.route?.path || req.path,
          status_code: statusCode,
        });

        // Метрики размера ответа
        const contentLength = res.get('Content-Length');
        if (contentLength) {
          metricsCollector.addToHistogram('http_response_size_bytes', parseInt(contentLength, 10), {
            method: req.method,
            path: req.route?.path || req.path,
            status_code: statusCode,
          });
        }

        // Счетчики по кодам ответа
        metricsCollector.incrementCounter('http_responses_total', {
          method: req.method,
          path: req.route?.path || req.path,
          status_code: statusCode,
        });

        // Счетчики ошибок
        if (res.statusCode >= 400) {
          metricsCollector.incrementCounter('http_errors_total', {
            method: req.method,
            path: req.route?.path || req.path,
            status_code: statusCode,
            error_type: getErrorType(res.statusCode),
          });
        }

        // Обновляем активные запросы
        metricsCollector.setGauge('http_requests_active', Math.max(0, getActiveRequestsCount() - 1));

        // Логируем медленные запросы
        if (duration > 1000) { // > 1 секунды
          logInfo('Медленный HTTP запрос', {
            method: req.method,
            path: req.path,
            duration,
            statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          });
        }
      } catch (error) {
        logError('Ошибка записи метрик HTTP запроса', error);
      }
    };

    // Перехватываем различные способы завершения ответа
    res.send = function(body: any) {
      finishRequest();
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      finishRequest();
      return originalJson.call(this, body);
    };

    res.end = function(chunk?: any, encoding?: any) {
      finishRequest();
      return originalEnd.call(this, chunk, encoding);
    };

    // Обработка закрытия соединения
    res.on('close', finishRequest);
    res.on('finish', finishRequest);

    next();
  } catch (error) {
    logError('Ошибка в httpMetricsMiddleware', error);
    next();
  }
};

/**
 * Middleware для сбора метрик ошибок
 */
export const errorMetricsMiddleware = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  try {
    // Увеличиваем счетчик ошибок приложения
    metricsCollector.incrementCounter('application_errors_total', {
      error_name: error.name,
      error_message: error.message.substring(0, 100), // Ограничиваем длину
      path: req.route?.path || req.path,
      method: req.method,
    });

    // Метрики типов ошибок
    const errorType = getErrorTypeFromError(error);
    metricsCollector.incrementCounter('error_types_total', {
      type: errorType,
      path: req.route?.path || req.path,
      method: req.method,
    });

    logError('Ошибка приложения зафиксирована в метриках', {
      error: error.message,
      path: req.path,
      method: req.method,
    });
  } catch (metricsError) {
    logError('Ошибка записи метрик ошибки', metricsError);
  }

  next(error);
};

/**
 * Middleware для сбора системных метрик
 */
export const systemMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Собираем системные метрики каждый 10-й запрос
    if (Math.random() < 0.1) {
      setImmediate(() => {
        collectSystemMetrics();
      });
    }

    next();
  } catch (error) {
    logError('Ошибка в systemMetricsMiddleware', error);
    next();
  }
};

/**
 * Middleware для мониторинга производительности базы данных
 */
export const databaseMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Перехватываем выполнение SQL запросов (если используется ORM/query builder)
    // Это примерная реализация, нужна адаптация под конкретную БД библиотеку
    
    const originalQuery = req.app.locals.db?.query;
    if (originalQuery) {
      req.app.locals.db.query = function(sql: string, params?: any[]) {
        const timer = metricsCollector.startTimer('database_query_duration_ms', {
          query_type: getQueryType(sql),
        });

        metricsCollector.incrementCounter('database_queries_total', {
          query_type: getQueryType(sql),
        });

        const result = originalQuery.call(this, sql, params);
        
        if (result && typeof result.then === 'function') {
          // Асинхронный запрос
          return result
            .then((data: any) => {
              timer();
              metricsCollector.incrementCounter('database_queries_success_total', {
                query_type: getQueryType(sql),
              });
              return data;
            })
            .catch((error: Error) => {
              timer();
              metricsCollector.incrementCounter('database_queries_error_total', {
                query_type: getQueryType(sql),
                error_type: error.name,
              });
              throw error;
            });
        } else {
          // Синхронный запрос
          timer();
          return result;
        }
      };
    }

    next();
  } catch (error) {
    logError('Ошибка в databaseMetricsMiddleware', error);
    next();
  }
};

/**
 * Middleware для мониторинга Redis операций
 */
export const redisMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Собираем метрики Redis каждый 20-й запрос
    if (Math.random() < 0.05) {
      setImmediate(async () => {
        try {
          const redisMetrics = await metricsCollector.getRedisMetrics();
          
          metricsCollector.setGauge('redis_connected_clients', redisMetrics.connectedClients);
          metricsCollector.setGauge('redis_used_memory_bytes', redisMetrics.usedMemory);
          metricsCollector.setGauge('redis_key_count', redisMetrics.keyCount);
          metricsCollector.setGauge('redis_hit_rate_percent', redisMetrics.hitRate);
          metricsCollector.setGauge('redis_miss_rate_percent', redisMetrics.missRate);
        } catch (error) {
          logError('Ошибка сбора метрик Redis', error);
        }
      });
    }

    next();
  } catch (error) {
    logError('Ошибка в redisMetricsMiddleware', error);
    next();
  }
};

/**
 * Middleware для мониторинга WebSocket соединений
 */
export const websocketMetricsMiddleware = (socket: any, next: Function): void => {
  try {
    // Увеличиваем счетчик подключений
    metricsCollector.incrementCounter('websocket_connections_total');
    metricsCollector.setGauge('websocket_connections_active', getActiveWebSocketCount() + 1);

    // Отслеживаем события
    socket.on('disconnect', () => {
      metricsCollector.incrementCounter('websocket_disconnections_total');
      metricsCollector.setGauge('websocket_connections_active', Math.max(0, getActiveWebSocketCount() - 1));
    });

    socket.on('error', (error: Error) => {
      metricsCollector.incrementCounter('websocket_errors_total', {
        error_type: error.name,
      });
    });

    // Отслеживаем сообщения
    const originalEmit = socket.emit;
    socket.emit = function(event: string, ...args: any[]) {
      metricsCollector.incrementCounter('websocket_messages_sent_total', {
        event_type: event,
      });
      return originalEmit.apply(this, [event, ...args]);
    };

    const originalOn = socket.on;
    socket.on = function(event: string, listener: Function) {
      if (event !== 'disconnect' && event !== 'error') {
        const wrappedListener = (...args: any[]) => {
          metricsCollector.incrementCounter('websocket_messages_received_total', {
            event_type: event,
          });
          return listener(...args);
        };
        return originalOn.call(this, event, wrappedListener);
      }
      return originalOn.call(this, event, listener);
    };

    next();
  } catch (error) {
    logError('Ошибка в websocketMetricsMiddleware', error);
    next();
  }
};

/**
 * Вспомогательные функции
 */

function getActiveRequestsCount(): number {
  // Простая реализация - в реальном приложении можно использовать более сложную логику
  return process.listeners('request').length || 0;
}

function getActiveWebSocketCount(): number {
  // Простая реализация - в реальном приложении нужно отслеживать фактические соединения
  return 0;
}

function getErrorType(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) {
    return 'client_error';
  } else if (statusCode >= 500) {
    return 'server_error';
  }
  return 'unknown';
}

function getErrorTypeFromError(error: Error): string {
  if (error.name === 'ValidationError') return 'validation';
  if (error.name === 'DatabaseError') return 'database';
  if (error.name === 'AuthenticationError') return 'authentication';
  if (error.name === 'AuthorizationError') return 'authorization';
  if (error.name === 'NetworkError') return 'network';
  if (error.name === 'TimeoutError') return 'timeout';
  return 'application';
}

function getQueryType(sql: string): string {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT')) return 'select';
  if (trimmed.startsWith('INSERT')) return 'insert';
  if (trimmed.startsWith('UPDATE')) return 'update';
  if (trimmed.startsWith('DELETE')) return 'delete';
  if (trimmed.startsWith('CREATE')) return 'create';
  if (trimmed.startsWith('DROP')) return 'drop';
  if (trimmed.startsWith('ALTER')) return 'alter';
  return 'other';
}

function collectSystemMetrics(): void {
  try {
    const systemMetrics = metricsCollector.getSystemMetrics();
    
    // Метрики памяти
    metricsCollector.setGauge('system_memory_used_bytes', systemMetrics.memory.used);
    metricsCollector.setGauge('system_memory_free_bytes', systemMetrics.memory.free);
    metricsCollector.setGauge('system_memory_total_bytes', systemMetrics.memory.total);
    metricsCollector.setGauge('system_memory_usage_percent', systemMetrics.memory.usage);

    // Метрики CPU
    metricsCollector.setGauge('system_cpu_usage_ms', systemMetrics.cpu.usage);
    if (systemMetrics.cpu.loadAverage.length > 0) {
      metricsCollector.setGauge('system_load_average_1m', systemMetrics.cpu.loadAverage[0]);
      if (systemMetrics.cpu.loadAverage.length > 1) {
        metricsCollector.setGauge('system_load_average_5m', systemMetrics.cpu.loadAverage[1]);
      }
      if (systemMetrics.cpu.loadAverage.length > 2) {
        metricsCollector.setGauge('system_load_average_15m', systemMetrics.cpu.loadAverage[2]);
      }
    }

    // Uptime
    metricsCollector.setGauge('system_uptime_seconds', systemMetrics.uptime);
  } catch (error) {
    logError('Ошибка сбора системных метрик', error);
  }
}
