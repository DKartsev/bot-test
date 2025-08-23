import express from 'express';
import { requireOperator } from '../middleware/auth';
import { errorHandlerService } from '../services/errorHandler';
import { logError, logInfo, logWarning } from '../utils/logger';

const router = express.Router();

// Helper функция для обертывания async handlers
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };

/**
 * Получение статистики ошибок
 */
router.get('/stats', requireOperator, asyncHandler(async (req, res) => {
  try {
    const stats = errorHandlerService.getErrorStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logError('Ошибка получения статистики ошибок', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить статистику ошибок' });
  }
}));

/**
 * Получение критических ошибок
 */
router.get('/critical', requireOperator, asyncHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const criticalErrors = errorHandlerService.getCriticalErrors(limit);
    
    res.json({
      success: true,
      data: {
        criticalErrors,
        total: criticalErrors.length,
        limit,
      },
    });
  } catch (error) {
    logError('Ошибка получения критических ошибок', {
      error: error instanceof Error ? error.message : 'Unknown error',
      limit: req.query.limit,
    });
    res.status(500).json({ error: 'Не удалось получить критические ошибки' });
  }
}));

/**
 * Получение текущей конфигурации обработки ошибок
 */
router.get('/config', requireOperator, asyncHandler(async (req, res) => {
  try {
    const config = errorHandlerService.getConfig();
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logError('Ошибка получения конфигурации обработки ошибок', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить конфигурацию' });
  }
}));

/**
 * Обновление конфигурации обработки ошибок
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
    if (updates.errorSamplingRate !== undefined) {
      if (typeof updates.errorSamplingRate !== 'number' || 
          updates.errorSamplingRate < 0 || 
          updates.errorSamplingRate > 1) {
        res.status(400).json({
          error: 'errorSamplingRate должен быть числом от 0 до 1',
          code: 'INVALID_SAMPLING_RATE',
        });
        return;
      }
    }
    
    if (updates.maxErrorDetailsLength !== undefined) {
      if (typeof updates.maxErrorDetailsLength !== 'number' || 
          updates.maxErrorDetailsLength < 100) {
        res.status(400).json({
          error: 'maxErrorDetailsLength должен быть не менее 100',
          code: 'INVALID_DETAILS_LENGTH',
        });
        return;
      }
    }
    
    // Обновляем конфигурацию
    errorHandlerService.updateConfig(updates);
    
    logInfo('Конфигурация обработки ошибок обновлена', {
      updates,
      operator: (req as any).operator?.id,
    });
    
    res.json({
      success: true,
      message: 'Конфигурация успешно обновлена',
      data: {
        updates,
        currentConfig: errorHandlerService.getConfig(),
      },
    });
  } catch (error) {
    logError('Ошибка обновления конфигурации обработки ошибок', {
      error: error instanceof Error ? error.message : 'Unknown error',
      updates: req.body,
    });
    res.status(500).json({ error: 'Не удалось обновить конфигурацию' });
  }
}));

/**
 * Сброс статистики ошибок
 */
router.post('/stats/reset', requireOperator, asyncHandler(async (req, res) => {
  try {
    errorHandlerService.resetErrorStats();
    
    logInfo('Статистика ошибок сброшена', {
      operator: (req as any).operator?.id,
    });
    
    res.json({
      success: true,
      message: 'Статистика ошибок успешно сброшена',
    });
  } catch (error) {
    logError('Ошибка сброса статистики ошибок', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось сбросить статистику' });
  }
}));

/**
 * Получение топ ошибок по частоте
 */
router.get('/top-errors', requireOperator, asyncHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const stats = errorHandlerService.getErrorStats();
    
    const topErrors = stats.topErrors
      .slice(0, limit)
      .map(error => ({
        code: error.code,
        count: error.count,
        percentage: (error.count / stats.totalErrors) * 100,
      }));
    
    res.json({
      success: true,
      data: {
        topErrors,
        totalErrors: stats.totalErrors,
        limit,
      },
    });
  } catch (error) {
    logError('Ошибка получения топ ошибок', {
      error: error instanceof Error ? error.message : 'Unknown error',
      limit: req.query.limit,
    });
    res.status(500).json({ error: 'Не удалось получить топ ошибок' });
  }
}));

/**
 * Получение ошибок по типу
 */
router.get('/by-type/:type', requireOperator, asyncHandler(async (req, res) => {
  try {
    const errorType = req.params.type;
    const stats = errorHandlerService.getErrorStats();
    
    // Фильтруем ошибки по типу
    const errorsByType = Object.entries(stats.errorCounts)
      .filter(([code]) => code.startsWith(errorType.toLowerCase()))
      .map(([code, count]) => ({
        code,
        count: Number(count),
        percentage: (Number(count) / Number(stats.totalErrors)) * 100,
      }))
      .sort((a, b) => Number(b.count) - Number(a.count));
    
    res.json({
      success: true,
      data: {
        errorType,
        errors: errorsByType,
        total: errorsByType.length,
        totalCount: errorsByType.reduce((sum, error) => sum + Number(error.count), 0),
      },
    });
  } catch (error) {
    logError('Ошибка получения ошибок по типу', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: req.params.type,
    });
    res.status(500).json({ error: 'Не удалось получить ошибки по типу' });
  }
}));

/**
 * Получение сводки по ошибкам
 */
router.get('/summary', requireOperator, asyncHandler(async (req, res) => {
  try {
    const stats = errorHandlerService.getErrorStats();
    
    // Группируем ошибки по типам
    const errorsByType: Record<string, number> = {};
    for (const [code, count] of Object.entries(stats.errorCounts)) {
      const type = code.split('_')[0].toUpperCase();
      errorsByType[type] = (errorsByType[type] || 0) + Number(count);
    }
    
    const summary = {
      totalErrors: stats.totalErrors,
      criticalErrorsCount: stats.criticalErrorsCount,
      errorsByType,
      topErrors: stats.topErrors.slice(0, 5),
      recommendations: generateRecommendations(stats),
    };
    
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logError('Ошибка получения сводки по ошибкам', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Не удалось получить сводку' });
  }
}));

/**
 * Тестирование системы обработки ошибок
 */
router.post('/test', requireOperator, asyncHandler(async (req, res) => {
  try {
    const { errorType, errorCode, message } = req.body;
    
    if (!errorType || !errorCode || !message) {
      res.status(400).json({
        error: 'Необходимо указать errorType, errorCode и message',
        code: 'MISSING_PARAMETERS',
      });
      return;
    }
    
    // Создаем тестовую ошибку
    const testError = errorHandlerService.createError(
      errorType as any,
      errorCode as any,
      message,
      { test: true, timestamp: new Date().toISOString() },
      req
    );
    
    logInfo('Тестовая ошибка создана', {
      error: testError,
      operator: (req as any).operator?.id,
    });
    
    res.json({
      success: true,
      message: 'Тестовая ошибка успешно создана',
      data: {
        error: testError,
        httpStatusCode: errorHandlerService.getHttpStatusCode(testError),
        formattedResponse: errorHandlerService.formatErrorForClient(testError),
      },
    });
  } catch (error) {
    logError('Ошибка создания тестовой ошибки', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });
    res.status(500).json({ error: 'Не удалось создать тестовую ошибку' });
  }
}));

/**
 * Экспорт статистики ошибок
 */
router.get('/export', requireOperator, asyncHandler(async (req, res) => {
  try {
    const format = req.query.format as string || 'json';
    const stats = errorHandlerService.getErrorStats();
    const criticalErrors = errorHandlerService.getCriticalErrors(100);
    
    if (format === 'csv') {
      const csvData = convertToCSV(stats, criticalErrors);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="error-stats.csv"');
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: {
          stats,
          criticalErrors,
          exportFormat: format,
          exportTimestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    logError('Ошибка экспорта статистики ошибок', {
      error: error instanceof Error ? error.message : 'Unknown error',
      format: req.query.format,
    });
    res.status(500).json({ error: 'Не удалось экспортировать статистику' });
  }
}));

/**
 * Вспомогательные функции
 */
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.criticalErrorsCount > 10) {
    recommendations.push('Высокое количество критических ошибок - требуется немедленное внимание');
  }
  
  if (stats.totalErrors > 1000) {
    recommendations.push('Общее количество ошибок высокое - рассмотрите улучшение обработки ошибок');
  }
  
  const topError = stats.topErrors[0];
  if (topError && topError.count > 100) {
    recommendations.push(`Частая ошибка ${topError.code} - рассмотрите исправление корневой причины`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Система обработки ошибок работает стабильно');
  }
  
  return recommendations;
}

function convertToCSV(stats: any, criticalErrors: any[]): string {
  const headers = ['Error Code', 'Count', 'Percentage', 'Type'];
  const rows = [];
  
  // Добавляем статистику по ошибкам
  for (const [code, count] of Object.entries(stats.errorCounts)) {
    const percentage = ((count as number) / stats.totalErrors) * 100;
    const type = code.split('_')[0].toUpperCase();
    rows.push([code, count, `${percentage.toFixed(2)}%`, type]);
  }
  
  // Добавляем критические ошибки
  if (criticalErrors.length > 0) {
    rows.push([]); // Пустая строка для разделения
    rows.push(['Critical Errors']);
    rows.push(['Timestamp', 'Code', 'Message', 'Path']);
    
    for (const error of criticalErrors) {
      rows.push([
        error.timestamp.toISOString(),
        error.code,
        error.message,
        error.path || 'N/A',
      ]);
    }
  }
  
  // Формируем CSV
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return csvContent;
}

export default router;
