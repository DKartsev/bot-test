import express from 'express';
import { SupabaseRAGService } from '../services/supabaseRAGService';
import { logError, logInfo } from '../utils/logger';

const router = express.Router();
const ragService = new SupabaseRAGService();

// Helper функция для обертывания async handlers
const asyncHandler = (fn: (req: express.Request, res: express.Response) => Promise<void>) => 
  (req: express.Request, res: express.Response) => { void fn(req, res); };

/**
 * Основной endpoint для RAG запросов через Supabase
 * POST /api/supabase-rag/query
 */
router.post('/query', asyncHandler(async (req, res) => {
  try {
    const startTime = Date.now();
    
    const { question, userId, chatId, language = 'ru', options } = req.body;

    logInfo('🔍 Получен RAG запрос через Supabase', { 
      question: question?.substring(0, 100), 
      userId,
      chatId,
      language,
    });

    // Валидация обязательных полей
    if (!question || question.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Вопрос обязателен',
        code: 'MISSING_QUESTION',
      });
      return;
    }

    // Обработка запроса через RAG пайплайн
    const response = await ragService.processQuery({
      question: question.trim(),
      userId,
      chatId,
      language,
      options: {
        temperature: options?.temperature || 0.3,
        maxTokens: options?.maxTokens || 1000,
        topK: options?.topK || 5,
        minSimilarity: options?.minSimilarity || 0.5,
      },
    });

    const totalTime = Date.now() - startTime;

    logInfo('✅ RAG запрос обработан успешно', { 
      question: question.substring(0, 100),
      totalTime: `${totalTime}ms`,
      confidence: response.confidence,
      sourcesCount: response.sources.length,
      fallbackUsed: response.metadata.fallbackUsed,
    });

    res.json({
      success: true,
      data: response,
      metadata: {
        processingTime: totalTime,
        timestamp: new Date().toISOString(),
        service: 'SupabaseRAG',
        version: '1.0.0',
      },
    });

  } catch (error) {
    logError('❌ Ошибка обработки RAG запроса', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
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
 * POST /api/supabase-rag/test
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

    logInfo('🧪 Тестирование RAG пайплайна', { testQuery });

    const testResult = await ragService.testPipeline(testQuery);

    if (testResult.success && testResult.response) {
      res.json({
        success: true,
        data: {
          testQuery,
          response: testResult.response,
          pipelineStatus: 'success',
          healthCheck: await ragService.healthCheck(),
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
    logError('❌ Ошибка тестирования RAG пайплайна', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR',
    });
  }
}));

/**
 * Проверка здоровья RAG сервиса
 * GET /api/supabase-rag/health
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const healthStatus = await ragService.healthCheck();
    
    res.json({
      success: true,
      data: {
        ...healthStatus,
        service: 'SupabaseRAG',
        version: '1.0.0',
        endpoints: {
          query: 'POST /api/supabase-rag/query',
          test: 'POST /api/supabase-rag/test',
          health: 'GET /api/supabase-rag/health',
        },
      },
    });
  } catch (error) {
    logError('❌ Ошибка проверки здоровья RAG сервиса', { 
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Сервис недоступен',
      code: 'SERVICE_UNAVAILABLE',
    });
  }
}));

/**
 * Получение информации о модели и конфигурации
 * GET /api/supabase-rag/info
 */
router.get('/info', asyncHandler(async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        service: 'SupabaseRAG',
        version: '1.0.0',
        pipeline: {
          step1: 'Создание embeddings для вопроса пользователя',
          step2: 'Поиск похожих чанков в Supabase через pgvector',
          step3: 'Генерация ответа через GPT на основе найденных чанков',
          step4: 'Возврат ответа с источниками и метаданными',
        },
        models: {
          openai: 'gpt-4o-mini',
          embedding: 'text-embedding-3-small',
        },
        database: {
          provider: 'Supabase',
          table: 'kb_chunks',
          vectorColumn: 'embedding',
          vectorDimension: 1536,
          searchOperator: '<-> (cosine distance)',
        },
        features: {
          vectorSearch: true,
          fallbackAnswers: true,
          confidenceScoring: true,
          sourceAttribution: true,
          errorHandling: true,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logError('❌ Ошибка получения информации о RAG сервисе', { 
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Не удалось получить информацию о сервисе',
      code: 'INFO_ERROR',
    });
  }
}));

export default router;
