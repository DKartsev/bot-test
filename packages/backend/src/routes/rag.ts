import express from 'express';
import { RAGService } from '../services/ragService';
import { logError, logInfo } from '../utils/logger';
import type { RAGQuery } from '../types/rag';

const router = express.Router();
const ragService = new RAGService();

// Helper функция для обертывания async handlers
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };

/**
 * Основной endpoint для RAG запросов
 * POST /api/rag/query
 */
router.post('/query', asyncHandler(async (req, res) => {
  try {
    const startTime = Date.now();
    
    const query: RAGQuery = {
      question: req.body.question,
      context: req.body.context,
      userId: req.body.userId,
      chatId: req.body.chatId,
      language: req.body.language || 'ru',
      options: req.body.options,
    };

    logInfo('Получен RAG запрос', { 
      question: query.question, 
      userId: query.userId,
      chatId: query.chatId 
    });

    // Валидация обязательных полей
    if (!query.question || query.question.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Вопрос обязателен',
        code: 'MISSING_QUESTION',
      });
      return;
    }

    // Обработка запроса через RAG пайплайн
    const response = await ragService.processQuery(query);
    const totalTime = Date.now() - startTime;

    logInfo('RAG запрос обработан успешно', { 
      question: query.question,
      totalTime,
      confidence: response.confidence 
    });

    res.json({
      success: true,
      data: response,
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    logError('Ошибка обработки RAG запроса', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body 
    });

    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR',
    });
  }
}));

/**
 * Тестирование RAG пайплайна
 * POST /api/rag/test
 */
router.post('/test', asyncHandler(async (req, res) => {
  try {
    const { testQuery } = req.body;

    if (!testQuery || testQuery.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Тестовый запрос обязателен',
        code: 'MISSING_TEST_QUERY',
      });
      return;
    }

    logInfo('Тестирование RAG пайплайна', { testQuery });

    const testResult = await ragService.testPipeline(testQuery);

    if (testResult.success && testResult.response) {
      res.json({
        success: true,
        data: {
          testQuery,
          response: testResult.response,
          pipelineStatus: 'success',
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: testResult.error || 'Неизвестная ошибка тестирования',
        code: 'TEST_FAILED',
      });
    }

  } catch (error) {
    logError('Ошибка тестирования RAG пайплайна', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body 
    });

    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR',
    });
  }
}));

/**
 * Получение статистики RAG пайплайна
 * GET /api/rag/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const stats = ragService.getPipelineStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        service: 'RAG Pipeline',
        version: '1.0.0',
      },
    });
  } catch (error) {
    logError('Ошибка получения статистики RAG', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    res.status(500).json({
      success: false,
      error: 'Не удалось получить статистику',
      code: 'STATS_ERROR',
    });
  }
}));

/**
 * Обновление конфигурации поиска
 * PUT /api/rag/config
 */
router.put('/config', asyncHandler(async (req, res) => {
  try {
    const { searchConfig } = req.body;

    if (!searchConfig || typeof searchConfig !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Конфигурация поиска обязательна',
        code: 'MISSING_CONFIG',
      });
      return;
    }

    logInfo('Обновление конфигурации RAG поиска', { searchConfig });

    ragService.updateSearchConfig(searchConfig);

    res.json({
      success: true,
      message: 'Конфигурация обновлена успешно',
      data: {
        updatedConfig: searchConfig,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    logError('Ошибка обновления конфигурации RAG', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body 
    });

    res.status(500).json({
      success: false,
      error: 'Не удалось обновить конфигурацию',
      code: 'CONFIG_UPDATE_ERROR',
    });
  }
}));

/**
 * Проверка здоровья RAG сервиса
 * GET /api/rag/health
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const stats = ragService.getPipelineStats();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        rag: 'operational',
        openai: stats.openaiStatus ? 'operational' : 'degraded',
        search: 'operational',
      },
      version: '1.0.0',
    };

    res.json({
      success: true,
      data: healthStatus,
    });
  } catch (error) {
    logError('Ошибка проверки здоровья RAG сервиса', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    res.status(500).json({
      success: false,
      error: 'Сервис недоступен',
      code: 'SERVICE_UNAVAILABLE',
    });
  }
}));

/**
 * Получение информации о модели
 * GET /api/rag/model-info
 */
router.get('/model-info', asyncHandler(async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        model: 'gpt-4o-mini',
        provider: 'OpenAI',
        capabilities: [
          'query_rephrasing',
          'draft_generation',
          'answer_refinement',
          'hybrid_search_optimization',
        ],
        maxTokens: 4000,
        temperature: 0.3,
        language: 'ru',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logError('Ошибка получения информации о модели', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    res.status(500).json({
      success: false,
      error: 'Не удалось получить информацию о модели',
      code: 'MODEL_INFO_ERROR',
    });
  }
}));

export default router;
