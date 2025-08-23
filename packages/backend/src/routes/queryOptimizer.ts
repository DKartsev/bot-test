import express from 'express';
import { requireOperator } from '../middleware/auth';
import { queryOptimizerService } from '../services/queryOptimizer';
import { logError, logInfo, logWarning } from '../utils/logger';

const router = express.Router();

// Helper функция для обертывания async handlers
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };

/**
 * Получение статистики производительности SQL запросов
 */
router.get('/stats', requireOperator, asyncHandler(async (req, res) => {
  try {
    const stats = queryOptimizerService.getPerformanceStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        slowQueries: stats.slowQueries.map(sq => ({
          ...sq,
          timestamp: sq.timestamp.toISOString(),
        })),
      },
    });
  } catch (error) {
    logError('Ошибка получения статистики производительности SQL', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить статистику' });
  }
}));

/**
 * Получение анализа конкретного запроса
 */
router.get('/analyze/:queryHash', requireOperator, asyncHandler(async (req, res) => {
  try {
    const queryHash = req.params.queryHash;
    const analysis = queryOptimizerService.getQueryAnalysis(queryHash);
    
    if (!analysis) {
      res.status(404).json({
        error: 'Анализ запроса не найден',
        code: 'ANALYSIS_NOT_FOUND',
      });
      return;
    }
    
    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logError('Ошибка получения анализа SQL запроса', {
      error: error instanceof Error ? error.message : 'Unknown error',
      queryHash: req.params.queryHash,
    });
    res.status(500).json({ error: 'Не удалось получить анализ' });
  }
}));

/**
 * Получение рекомендаций по индексам
 */
router.get('/index-recommendations', requireOperator, asyncHandler(async (req, res) => {
  try {
    const recommendations = queryOptimizerService.getIndexRecommendations();
    
    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
      },
    });
  } catch (error) {
    logError('Ошибка получения рекомендаций по индексам', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить рекомендации' });
  }
}));

/**
 * Получение текущей конфигурации оптимизации
 */
router.get('/config', requireOperator, asyncHandler(async (req, res) => {
  try {
    const config = queryOptimizerService.getConfig();
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logError('Ошибка получения конфигурации оптимизации', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить конфигурацию' });
  }
}));

/**
 * Обновление конфигурации оптимизации
 */
router.put('/config', requireOperator, asyncHandler(async (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      res.status(400).json({
        error: 'Необходимо указать параметры для обновления',
        code: 'MISSING_UPDATES',
      });
      return;
    }
    
    // Валидируем параметры
    if (updates.slowQueryThreshold && (typeof updates.slowQueryThreshold !== 'number' || updates.slowQueryThreshold < 0)) {
      res.status(400).json({
        error: 'slowQueryThreshold должен быть положительным числом',
        code: 'INVALID_THRESHOLD',
      });
      return;
    }
    
    if (updates.maxQueryLength && (typeof updates.maxQueryLength !== 'number' || updates.maxQueryLength < 100)) {
      res.status(400).json({
        error: 'maxQueryLength должен быть не менее 100',
        code: 'INVALID_QUERY_LENGTH',
      });
      return;
    }
    
    // Обновляем конфигурацию
    queryOptimizerService.updateConfig(updates);
    
    logInfo('Конфигурация оптимизации SQL обновлена', {
      updates,
      operator: (req as any).operator?.id,
    });
    
    res.json({
      success: true,
      message: 'Конфигурация успешно обновлена',
      data: {
        updates,
        currentConfig: queryOptimizerService.getConfig(),
      },
    });
  } catch (error) {
    logError('Ошибка обновления конфигурации оптимизации', {
      error: error instanceof Error ? error.message : 'Unknown error',
      updates: req.body,
    });
    res.status(500).json({ error: 'Не удалось обновить конфигурацию' });
  }
}));

/**
 * Сброс статистики производительности
 */
router.post('/stats/reset', requireOperator, asyncHandler(async (req, res) => {
  try {
    queryOptimizerService.resetStats();
    
    logInfo('Статистика производительности SQL сброшена', {
      operator: (req as any).operator?.id,
    });
    
    res.json({
      success: true,
      message: 'Статистика производительности SQL успешно сброшена',
    });
  } catch (error) {
    logError('Ошибка сброса статистики производительности SQL', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось сбросить статистику' });
  }
}));

/**
 * Получение топ медленных запросов
 */
router.get('/slow-queries', requireOperator, asyncHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const stats = queryOptimizerService.getPerformanceStats();
    
    const slowQueries = stats.slowQueries
      .slice(0, limit)
      .map(sq => ({
        ...sq,
        timestamp: sq.timestamp.toISOString(),
      }));
    
    res.json({
      success: true,
      data: {
        slowQueries,
        total: stats.slowQueries.length,
        limit,
      },
    });
  } catch (error) {
    logError('Ошибка получения топ медленных запросов', {
      error: error instanceof Error ? error.message : 'Unknown error',
      limit: req.query.limit,
    });
    res.status(500).json({ error: 'Не удалось получить медленные запросы' });
  }
}));

/**
 * Получение статистики по индексам
 */
router.get('/index-stats', requireOperator, asyncHandler(async (req, res) => {
  try {
    const stats = queryOptimizerService.getPerformanceStats();
    
    const indexStats = Object.entries(stats.indexUsage).map(([index, count]) => ({
      index,
      usageCount: count,
      usagePercentage: (count / stats.totalQueries) * 100,
    }));
    
    // Сортируем по частоте использования
    indexStats.sort((a, b) => b.usageCount - a.usageCount);
    
    res.json({
      success: true,
      data: {
        indexStats,
        totalQueries: stats.totalQueries,
        indexScans: stats.indexScans,
        tableScans: stats.tableScans,
        indexEfficiency: stats.indexScans / (stats.indexScans + stats.tableScans),
      },
    });
  } catch (error) {
    logError('Ошибка получения статистики по индексам', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить статистику по индексам' });
  }
}));

/**
 * Анализ производительности конкретного endpoint
 */
router.post('/analyze-endpoint', requireOperator, asyncHandler(async (req, res) => {
  try {
    const { path, method, filters } = req.body;
    
    if (!path || !method) {
      res.status(400).json({
        error: 'Необходимо указать path и method',
        code: 'MISSING_PARAMETERS',
      });
      return;
    }
    
    // Создаем mock запрос для анализа
    const mockReq = {
      path,
      method,
      query: filters || {},
    } as any;
    
    // Анализируем endpoint
    const analysis = await queryOptimizerService.analyzeQuery(
      `SELECT * FROM ${getTableFromPath(path)}`,
      {
        executionTime: 0, // Время выполнения неизвестно
        rowsReturned: 100, // Предполагаемое количество строк
        rowsScanned: 500, // Предполагаемое количество сканированных строк
        indexUsage: getDefaultIndexes(path)
      }
    );
    
    res.json({
      success: true,
      data: {
        endpoint: `${method} ${path}`,
        analysis,
        recommendations: analysis.suggestions,
        warnings: analysis.warnings,
      },
    });
  } catch (error) {
    logError('Ошибка анализа endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });
    res.status(500).json({ error: 'Не удалось проанализировать endpoint' });
  }
}));

/**
 * Получение сводки производительности
 */
router.get('/summary', requireOperator, asyncHandler(async (req, res) => {
  try {
    const stats = queryOptimizerService.getPerformanceStats();
    const recommendations = queryOptimizerService.getIndexRecommendations();
    
    const summary = {
      totalQueries: stats.totalQueries,
      averageExecutionTime: Math.round(stats.averageExecutionTime),
      slowQueriesCount: stats.slowQueries.length,
      indexEfficiency: stats.indexScans / (stats.indexScans + stats.tableScans),
      performance: {
        excellent: 0,
        good: 0,
        poor: 0,
        critical: 0,
      },
      topIssues: recommendations.slice(0, 5),
      recommendationsCount: recommendations.length,
    };
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logError('Ошибка получения сводки производительности', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить сводку' });
  }
}));

/**
 * Вспомогательные функции
 */
function getTableFromPath(path: string): string {
  if (path.includes('/chats')) return 'chats';
  if (path.includes('/messages')) return 'messages';
  if (path.includes('/operators')) return 'operators';
  if (path.includes('/users')) return 'users';
  if (path.includes('/attachments')) return 'attachments';
  if (path.includes('/notes')) return 'notes';
  if (path.includes('/cases')) return 'cases';
  return 'unknown';
}

function getDefaultIndexes(path: string): string[] {
  if (path.includes('/chats')) {
    return ['idx_chats_status', 'idx_chats_priority', 'idx_chats_operator_id'];
  } else if (path.includes('/messages')) {
    return ['idx_messages_chat_id', 'idx_messages_created_at'];
  } else if (path.includes('/operators')) {
    return ['idx_operators_id'];
  }
  return [];
}

export default router;
