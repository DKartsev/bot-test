import { Router, Request, Response } from 'express';
import { metricsCollector } from '../services/metricsCollector';
import { logInfo, logError } from '../utils/logger';
import { rateLimitMiddleware } from '../services/rateLimiter';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MetricData:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Название метрики
 *         type:
 *           type: string
 *           enum: [counter, gauge, histogram, summary]
 *           description: Тип метрики
 *         value:
 *           type: number
 *           description: Значение метрики
 *         labels:
 *           type: object
 *           description: Метки метрики
 *         timestamp:
 *           type: number
 *           description: Временная метка
 * 
 *     ApiPerformanceStats:
 *       type: object
 *       properties:
 *         totalRequests:
 *           type: number
 *           description: Общее количество запросов
 *         totalErrors:
 *           type: number
 *           description: Общее количество ошибок
 *         averageResponseTime:
 *           type: number
 *           description: Среднее время ответа в мс
 *         requestsPerSecond:
 *           type: number
 *           description: Запросов в секунду
 *         errorRate:
 *           type: number
 *           description: Процент ошибок
 *         slowestEndpoints:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               path:
 *                 type: string
 *               method:
 *                 type: string
 *               averageTime:
 *                 type: number
 *               requestCount:
 *                 type: number
 * 
 *     SystemMetrics:
 *       type: object
 *       properties:
 *         memory:
 *           type: object
 *           properties:
 *             used:
 *               type: number
 *             free:
 *               type: number
 *             total:
 *               type: number
 *             usage:
 *               type: number
 *         cpu:
 *           type: object
 *           properties:
 *             usage:
 *               type: number
 *             loadAverage:
 *               type: array
 *               items:
 *                 type: number
 *         uptime:
 *           type: number
 *         nodeVersion:
 *           type: string
 *         platform:
 *           type: string
 * 
 *     RedisMetrics:
 *       type: object
 *       properties:
 *         isConnected:
 *           type: boolean
 *         usedMemory:
 *           type: number
 *         connectedClients:
 *           type: number
 *         commandsProcessed:
 *           type: number
 *         hitRate:
 *           type: number
 *         missRate:
 *           type: number
 *         keyCount:
 *           type: number
 *         expiredKeys:
 *           type: number
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   - name: Метрики
 *     description: API для работы с метриками и мониторингом
 */

/**
 * @swagger
 * /api/metrics/performance:
 *   get:
 *     summary: Получение статистики производительности API
 *     description: Возвращает детальную статистику производительности API за указанный период
 *     tags: [Метрики]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: integer
 *           default: 3600000
 *         description: Временной диапазон в миллисекундах (по умолчанию 1 час)
 *     responses:
 *       200:
 *         description: Статистика производительности API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ApiPerformanceStats'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/performance', rateLimitMiddleware.monitoring(), async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string, 10) : undefined;
    
    if (timeRange && (timeRange < 60000 || timeRange > 7 * 24 * 60 * 60 * 1000)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'timeRange должен быть от 1 минуты до 7 дней',
        },
      });
    }

    const stats = await metricsCollector.getApiPerformanceStats(timeRange);

    logInfo('Статистика производительности API запрошена', {
      timeRange,
      totalRequests: stats.totalRequests,
      averageResponseTime: stats.averageResponseTime,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logError('Ошибка получения статистики производительности', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка получения статистики производительности',
      },
    });
  }
});

/**
 * @swagger
 * /api/metrics/system:
 *   get:
 *     summary: Получение системных метрик
 *     description: Возвращает текущие системные метрики (память, CPU, uptime)
 *     tags: [Метрики]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Системные метрики
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SystemMetrics'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/system', rateLimitMiddleware.monitoring(), (req: Request, res: Response) => {
  try {
    const systemMetrics = metricsCollector.getSystemMetrics();

    res.json({
      success: true,
      data: systemMetrics,
    });
  } catch (error) {
    logError('Ошибка получения системных метрик', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка получения системных метрик',
      },
    });
  }
});

/**
 * @swagger
 * /api/metrics/redis:
 *   get:
 *     summary: Получение метрик Redis
 *     description: Возвращает метрики состояния и производительности Redis
 *     tags: [Метрики]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Метрики Redis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RedisMetrics'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/redis', rateLimitMiddleware.monitoring(), async (req: Request, res: Response) => {
  try {
    const redisMetrics = await metricsCollector.getRedisMetrics();

    res.json({
      success: true,
      data: redisMetrics,
    });
  } catch (error) {
    logError('Ошибка получения метрик Redis', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка получения метрик Redis',
      },
    });
  }
});

/**
 * @swagger
 * /api/metrics/histogram/{name}:
 *   get:
 *     summary: Получение данных гистограммы
 *     description: Возвращает статистические данные гистограммы по имени
 *     tags: [Метрики]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Название гистограммы
 *       - in: query
 *         name: labels
 *         schema:
 *           type: string
 *         description: JSON строка с метками для фильтрации
 *     responses:
 *       200:
 *         description: Данные гистограммы
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: number
 *                     sum:
 *                       type: number
 *                     min:
 *                       type: number
 *                     max:
 *                       type: number
 *                     avg:
 *                       type: number
 *                     p50:
 *                       type: number
 *                     p95:
 *                       type: number
 *                     p99:
 *                       type: number
 *                     buckets:
 *                       type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Гистограмма не найдена
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/histogram/:name', rateLimitMiddleware.monitoring(), (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    let labels: Record<string, string> | undefined;

    if (req.query.labels) {
      try {
        labels = JSON.parse(req.query.labels as string);
      } catch {
        return res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Неверный формат JSON для labels',
          },
        });
      }
    }

    const histogram = metricsCollector.getHistogram(name, labels);

    if (!histogram) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Гистограмма не найдена',
        },
      });
    }

    // Преобразуем Map в объект для JSON
    const bucketsObj = Object.fromEntries(histogram.buckets);

    res.json({
      success: true,
      data: {
        ...histogram,
        buckets: bucketsObj,
      },
    });
  } catch (error) {
    logError('Ошибка получения данных гистограммы', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка получения данных гистограммы',
      },
    });
  }
});

/**
 * @swagger
 * /api/metrics/export:
 *   get:
 *     summary: Экспорт всех метрик
 *     description: Возвращает все собранные метрики в различных форматах
 *     tags: [Метрики]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, prometheus]
 *           default: json
 *         description: Формат экспорта
 *     responses:
 *       200:
 *         description: Экспортированные метрики
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     counters:
 *                       type: object
 *                     gauges:
 *                       type: object
 *                     histograms:
 *                       type: object
 *                     config:
 *                       type: object
 *                     collectionTime:
 *                       type: number
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Метрики в формате Prometheus
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/export', rateLimitMiddleware.monitoring(), (req: Request, res: Response) => {
  try {
    const format = req.query.format as string || 'json';

    if (!['json', 'prometheus'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Поддерживаемые форматы: json, prometheus',
        },
      });
    }

    const exportData = metricsCollector.exportMetrics();

    if (format === 'prometheus') {
      const prometheusFormat = convertToPrometheusFormat(exportData);
      res.set('Content-Type', 'text/plain');
      return res.send(prometheusFormat);
    }

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    logError('Ошибка экспорта метрик', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка экспорта метрик',
      },
    });
  }
});

/**
 * @swagger
 * /api/metrics/collector/stats:
 *   get:
 *     summary: Статистика сборщика метрик
 *     description: Возвращает статистику работы сборщика метрик
 *     tags: [Метрики]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика сборщика
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalMetrics:
 *                       type: number
 *                     totalCounters:
 *                       type: number
 *                     totalGauges:
 *                       type: number
 *                     totalHistograms:
 *                       type: number
 *                     activeTimers:
 *                       type: number
 *                     memoryUsage:
 *                       type: number
 *                     config:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/collector/stats', rateLimitMiddleware.monitoring(), (req: Request, res: Response) => {
  try {
    const stats = metricsCollector.getCollectorStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logError('Ошибка получения статистики сборщика', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка получения статистики сборщика',
      },
    });
  }
});

/**
 * @swagger
 * /api/metrics/collector/config:
 *   put:
 *     summary: Обновление конфигурации сборщика метрик
 *     description: Обновляет настройки сборщика метрик
 *     tags: [Метрики]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               retentionPeriod:
 *                 type: number
 *               batchSize:
 *                 type: number
 *               flushInterval:
 *                 type: number
 *               enableRedisStorage:
 *                 type: boolean
 *               enableMemoryStorage:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Конфигурация обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/collector/config', rateLimitMiddleware.admin(), (req: Request, res: Response) => {
  try {
    const updates = req.body;

    // Валидация
    if (updates.retentionPeriod && (updates.retentionPeriod < 60000 || updates.retentionPeriod > 30 * 24 * 60 * 60 * 1000)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'retentionPeriod должен быть от 1 минуты до 30 дней',
        },
      });
    }

    if (updates.batchSize && (updates.batchSize < 1 || updates.batchSize > 10000)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'batchSize должен быть от 1 до 10000',
        },
      });
    }

    if (updates.flushInterval && (updates.flushInterval < 10000 || updates.flushInterval > 3600000)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'flushInterval должен быть от 10 секунд до 1 часа',
        },
      });
    }

    metricsCollector.updateConfig(updates);

    logInfo('Конфигурация сборщика метрик обновлена', updates);

    res.json({
      success: true,
      message: 'Конфигурация успешно обновлена',
    });
  } catch (error) {
    logError('Ошибка обновления конфигурации сборщика', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка обновления конфигурации',
      },
    });
  }
});

/**
 * @swagger
 * /api/metrics/reset:
 *   post:
 *     summary: Сброс всех метрик
 *     description: Очищает все собранные метрики
 *     tags: [Метрики]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Метрики сброшены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/reset', rateLimitMiddleware.admin(), (req: Request, res: Response) => {
  try {
    metricsCollector.resetMetrics();

    logInfo('Все метрики сброшены', {
      requestedBy: req.user?.id || 'unknown',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Все метрики успешно сброшены',
    });
  } catch (error) {
    logError('Ошибка сброса метрик', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Ошибка сброса метрик',
      },
    });
  }
});

/**
 * Вспомогательные функции
 */

function convertToPrometheusFormat(exportData: any): string {
  let output = '';
  const timestamp = Date.now();

  // Конвертируем counters
  for (const [key, value] of Object.entries(exportData.counters)) {
    output += `# TYPE ${key} counter\n`;
    output += `${key} ${value} ${timestamp}\n\n`;
  }

  // Конвертируем gauges
  for (const [key, value] of Object.entries(exportData.gauges)) {
    output += `# TYPE ${key} gauge\n`;
    output += `${key} ${value} ${timestamp}\n\n`;
  }

  // Конвертируем histograms
  for (const [key, histogram] of Object.entries(exportData.histograms)) {
    if (histogram && typeof histogram === 'object') {
      const hist = histogram as any;
      output += `# TYPE ${key} histogram\n`;
      
      if (hist.buckets) {
        for (const [bucket, count] of Object.entries(hist.buckets)) {
          output += `${key}_bucket{le="${bucket}"} ${count} ${timestamp}\n`;
        }
      }
      
      output += `${key}_sum ${hist.sum || 0} ${timestamp}\n`;
      output += `${key}_count ${hist.count || 0} ${timestamp}\n\n`;
    }
  }

  return output;
}

export default router;
