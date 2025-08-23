import { Request, Response, NextFunction } from 'express';
import { queryOptimizerService } from '../services/queryOptimizer';
import { logInfo, logWarning } from '../utils/logger';

/**
 * Middleware для анализа SQL запросов
 */
export const queryAnalyzerMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;

    // Перехватываем отправку ответа для анализа
    res.send = function(data: any) {
      const executionTime = Date.now() - startTime;
      analyzeResponse(req, res, executionTime, data);
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      const executionTime = Date.now() - startTime;
      analyzeResponse(req, res, executionTime, data);
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Анализ ответа и запроса
 */
async function analyzeResponse(req: Request, res: Response, executionTime: number, data: any): Promise<void> {
  try {
    // Анализируем только API запросы
    if (!req.path.startsWith('/api') && !req.path.startsWith('/telegram')) {
      return;
    }

    // Получаем информацию о запросе
    const queryInfo = extractQueryInfo(req, data);
    
    if (queryInfo) {
      // Анализируем запрос через QueryOptimizerService
      const analysis = await queryOptimizerService.analyzeQuery(
        queryInfo.query,
        {
          executionTime,
          rowsReturned: queryInfo.rowsReturned,
          rowsScanned: queryInfo.rowsScanned,
          indexUsage: queryInfo.indexUsage
        }
      );

      // Логируем результаты анализа если есть предупреждения
      if (analysis.warnings.length > 0 || analysis.performance === 'poor' || analysis.performance === 'critical') {
        logWarning('SQL запрос требует оптимизации', {
          path: req.path,
          method: req.method,
          executionTime,
          performance: analysis.performance,
          warnings: analysis.warnings,
          suggestions: analysis.suggestions,
        });
      }

      // Добавляем заголовки с информацией о производительности
      res.set('X-Query-Performance', analysis.performance);
      res.set('X-Query-Execution-Time', executionTime.toString());
      
      if (analysis.warnings.length > 0) {
        res.set('X-Query-Warnings', analysis.warnings.length.toString());
      }
    }
  } catch (error) {
    // Игнорируем ошибки анализа, чтобы не влиять на основной функционал
    logWarning('Ошибка анализа SQL запроса', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * Извлечение информации о запросе из request и response
 */
function extractQueryInfo(req: Request, data: any): {
  query: string;
  rowsReturned: number;
  rowsScanned: number;
  indexUsage: string[];
} | null {
  try {
    // Анализируем различные типы запросов
    if (req.path.includes('/chats') && req.method === 'GET') {
      return analyzeChatsQuery(req, data);
    } else if (req.path.includes('/messages') && req.method === 'GET') {
      return analyzeMessagesQuery(req, data);
    } else if (req.path.includes('/search') && req.method === 'GET') {
      return analyzeSearchQuery(req, data);
    } else if (req.path.includes('/operators') && req.method === 'GET') {
      return analyzeOperatorsQuery(req, data);
    }

    // Для других запросов возвращаем базовую информацию
    return {
      query: `SELECT * FROM ${getTableFromPath(req.path)}`,
      rowsReturned: Array.isArray(data) ? data.length : 1,
      rowsScanned: Array.isArray(data) ? Math.max(data.length * 2, 100) : 100,
      indexUsage: [],
    };
  } catch (error) {
    return null;
  }
}

/**
 * Анализ запросов к чатам
 */
function analyzeChatsQuery(req: Request, data: any) {
  const filters = req.query;
  let query = 'SELECT * FROM chats';
  let conditions: string[] = [];
  let indexUsage: string[] = [];

  // Анализируем фильтры
  if (filters.status) {
    conditions.push('status IN (?)');
    indexUsage.push('idx_chats_status');
  }
  
  if (filters.priority) {
    conditions.push('priority IN (?)');
    indexUsage.push('idx_chats_priority');
  }
  
  if (filters.operator_id) {
    conditions.push('operator_id = ?');
    indexUsage.push('idx_chats_operator_id');
  }
  
  if (filters.has_attachments === 'true') {
    conditions.push('has_attachments = true');
    indexUsage.push('idx_chats_attachments');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Добавляем сортировку и пагинацию
  query += ' ORDER BY created_at DESC';
  if (filters.limit) {
    query += ` LIMIT ${filters.limit}`;
  }

  return {
    query,
    rowsReturned: Array.isArray(data) ? data.length : 0,
    rowsScanned: Array.isArray(data) ? Math.max(data.length * 3, 200) : 200,
    indexUsage,
  };
}

/**
 * Анализ запросов к сообщениям
 */
function analyzeMessagesQuery(req: Request, data: any) {
  const chatId = req.params.id;
  const limit = req.query.limit || 50;
  const offset = req.query.offset || 0;

  const query = `SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  
  return {
    query,
    rowsReturned: Array.isArray(data) ? data.length : 0,
    rowsScanned: Array.isArray(data) ? Math.max(data.length * 2, 100) : 100,
    indexUsage: ['idx_messages_chat_id', 'idx_messages_created_at'],
  };
}

/**
 * Анализ поисковых запросов
 */
function analyzeSearchQuery(req: Request, data: any) {
  const query = req.query.q as string;
  const table = req.path.includes('chats') ? 'chats' : 'messages';
  
  let sqlQuery = `SELECT * FROM ${table}`;
  let indexUsage: string[] = [];

  if (query) {
    if (table === 'chats') {
      sqlQuery += ` WHERE title LIKE '%${query}%' OR description LIKE '%${query}%'`;
      indexUsage.push('idx_chats_title_description');
    } else {
      sqlQuery += ` WHERE text LIKE '%${query}%'`;
      indexUsage.push('idx_messages_text');
    }
  }

  return {
    query: sqlQuery,
    rowsReturned: Array.isArray(data) ? data.length : 0,
    rowsScanned: Array.isArray(data) ? Math.max(data.length * 5, 500) : 500,
    indexUsage,
  };
}

/**
 * Анализ запросов к операторам
 */
function analyzeOperatorsQuery(req: Request, data: any) {
  const operatorId = req.params.id;
  const query = `SELECT * FROM operators WHERE id = ?`;
  
  return {
    query,
    rowsReturned: data ? 1 : 0,
    rowsScanned: 1,
    indexUsage: ['idx_operators_id'],
  };
}

/**
 * Определение таблицы по пути запроса
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

/**
 * Middleware для анализа конкретного endpoint
 */
export const analyzeEndpoint = (endpoint: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Добавляем метку endpoint для анализа
    (req as any).endpoint = endpoint;
    next();
  };
};

/**
 * Middleware для принудительного анализа медленных запросов
 */
export const forceQueryAnalysis = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const executionTime = Date.now() - startTime;
      
      if (executionTime > threshold) {
        logWarning('Принудительный анализ медленного запроса', {
          path: req.path,
          method: req.method,
          executionTime,
          threshold,
        });
      }
    });
    
    next();
  };
};
