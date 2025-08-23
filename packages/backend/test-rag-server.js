const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Mock RAG Service
class MockRAGService {
  async processQuery(query) {
    console.log('RAG Query received:', query);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      answer: `Это тестовый ответ на вопрос: "${query.question}". Система RAG работает корректно!`,
      sources: [
        {
          id: 'test-1',
          title: 'Тестовый источник',
          content: 'Содержание тестового источника для демонстрации работы RAG пайплайна.',
          score: 0.9,
          source: 'hybrid'
        }
      ],
      confidence: 0.85,
      searchTime: 50,
      processingTime: 150,
      totalTime: 200,
      metadata: {
        queryRephrased: query.question,
        searchStrategy: 'hybrid',
        refineIterations: 1,
        modelUsed: 'gpt-4o-mini'
      }
    };
  }

  async testPipeline(testQuery) {
    return {
      success: true,
      response: await this.processQuery({ question: testQuery })
    };
  }

  getPipelineStats() {
    return {
      openaiStatus: true,
      searchConfig: {
        vectorWeight: 0.7,
        keywordWeight: 0.3,
        maxResults: 10
      },
      lastQueryTime: new Date()
    };
  }
}

const ragService = new MockRAGService();

// RAG Routes
app.post('/api/rag/query', async (req, res) => {
  try {
    const { question, context, userId, chatId, language, options } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Вопрос обязателен',
        code: 'MISSING_QUESTION'
      });
    }

    const response = await ragService.processQuery({
      question,
      context,
      userId,
      chatId,
      language: language || 'ru',
      options
    });

    res.json({
      success: true,
      data: response,
      metadata: {
        processingTime: response.totalTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('RAG Query Error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR'
    });
  }
});

app.post('/api/rag/test', async (req, res) => {
  try {
    const { testQuery } = req.body;
    
    if (!testQuery) {
      return res.status(400).json({
        success: false,
        error: 'Тестовый запрос обязателен',
        code: 'MISSING_TEST_QUERY'
      });
    }

    const testResult = await ragService.testPipeline(testQuery);

    res.json({
      success: true,
      data: {
        testQuery,
        response: testResult.response,
        pipelineStatus: 'success'
      }
    });

  } catch (error) {
    console.error('RAG Test Error:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR'
    });
  }
});

app.get('/api/rag/stats', (req, res) => {
  try {
    const stats = ragService.getPipelineStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        service: 'RAG Pipeline',
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('RAG Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось получить статистику',
      code: 'STATS_ERROR'
    });
  }
});

app.get('/api/rag/health', (req, res) => {
  try {
    const stats = ragService.getPipelineStats();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        rag: 'operational',
        openai: stats.openaiStatus ? 'operational' : 'degraded',
        search: 'operational'
      },
      version: '1.0.0'
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('RAG Health Error:', error);
    res.status(500).json({
      success: false,
      error: 'Сервис недоступен',
      code: 'SERVICE_UNAVAILABLE'
    });
  }
});

app.get('/api/rag/model-info', (req, res) => {
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
          'hybrid_search_optimization'
        ],
        maxTokens: 4000,
        temperature: 0.3,
        language: 'ru',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('RAG Model Info Error:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось получить информацию о модели',
      code: 'MODEL_INFO_ERROR'
    });
  }
});

app.put('/api/rag/config', (req, res) => {
  try {
    const { searchConfig } = req.body;

    if (!searchConfig || typeof searchConfig !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Конфигурация поиска обязательна',
        code: 'MISSING_CONFIG'
      });
    }

    console.log('Updating RAG search config:', searchConfig);

    res.json({
      success: true,
      message: 'Конфигурация обновлена успешно',
      data: {
        updatedConfig: searchConfig,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('RAG Config Update Error:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось обновить конфигурацию',
      code: 'CONFIG_UPDATE_ERROR'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'RAG Test Server',
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RAG Test Server запущен на порту ${PORT}`);
  console.log(`🔗 API доступен на http://localhost:${PORT}/api/rag`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Тестирование: http://localhost:${PORT}/api/rag/test`);
});
