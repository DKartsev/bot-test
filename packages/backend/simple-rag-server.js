const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Mock RAG Service - полностью реализованный пайплайн
class MockRAGService {
  async processQuery(query) {
    console.log('RAG Query received:', query);
    
    const startTime = Date.now();
    
    try {
      // Шаг 1: Переформулировка запроса
      const rephrasedQuery = await this.rephraseQuery(query.question, query.context);
      console.log('Query rephrased:', rephrasedQuery);
      
      // Шаг 2: Гибридный поиск
      const searchResults = await this.performHybridSearch(rephrasedQuery);
      const searchTime = Date.now() - startTime;
      console.log('Search completed:', searchResults.length, 'results');
      
      // Шаг 3: Генерация черновика
      const draft = await this.generateDraft(query.question, searchResults, query.context);
      console.log('Draft generated');
      
      // Шаг 4: RAG улучшение
      const refinedAnswer = await this.refineAnswer(query.question, draft, searchResults, query.context);
      const processingTime = Date.now() - startTime;
      console.log('Answer refined');
      
      const totalTime = Date.now() - startTime;
      
      return {
        answer: refinedAnswer,
        sources: searchResults,
        confidence: 0.85,
        searchTime,
        processingTime,
        totalTime,
        metadata: {
          queryRephrased: rephrasedQuery,
          searchStrategy: 'hybrid',
          refineIterations: 1,
          modelUsed: 'gpt-4o-mini',
        },
      };
    } catch (error) {
      console.error('Error in RAG pipeline:', error);
      return {
        answer: 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте переформулировать вопрос.',
        sources: [],
        confidence: 0.1,
        searchTime: 0,
        processingTime: 0,
        totalTime: Date.now() - startTime,
        metadata: {
          queryRephrased: query.question,
          searchStrategy: 'fallback',
          refineIterations: 0,
          modelUsed: 'none',
        },
      };
    }
  }

  // Шаг 1: Переформулировка запроса
  async rephraseQuery(question, context) {
    // Симуляция переформулировки через LLM
    const rephrased = question.replace(/как/i, 'способы')
                             .replace(/что/i, 'информация о')
                             .replace(/где/i, 'места для');
    
    return rephrased || question;
  }

  // Шаг 2: Гибридный поиск
  async performHybridSearch(query) {
    // Симуляция гибридного поиска (векторный + ключевой)
    const mockDocuments = [
      {
        id: 'doc-1',
        title: 'Как пополнить баланс',
        content: 'Для пополнения баланса используйте QR-код, банковскую карту или наличные в терминале. QR-код можно отсканировать в мобильном приложении банка.',
        score: 0.9,
        source: 'hybrid',
      },
      {
        id: 'doc-2',
        title: 'Способы пополнения баланса',
        content: 'Доступные способы пополнения: 1) QR-код через мобильное приложение, 2) Банковская карта в терминале, 3) Наличные в терминале, 4) Перевод с банковского счета.',
        score: 0.85,
        source: 'hybrid',
      },
      {
        id: 'doc-3',
        title: 'Проблемы с пополнением',
        content: 'Если возникают проблемы с пополнением баланса, проверьте: корректность введенных данных, достаточность средств на карте, статус терминала.',
        score: 0.7,
        source: 'hybrid',
      }
    ];

    // Фильтруем по релевантности
    return mockDocuments.filter(doc => 
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Шаг 3: Генерация черновика
  async generateDraft(question, sources, context) {
    if (sources.length === 0) {
      return 'К сожалению, не удалось найти информацию по вашему запросу.';
    }

    const bestSource = sources[0];
    return `На основе найденной информации: ${bestSource.content}`;
  }

  // Шаг 4: RAG улучшение
  async refineAnswer(question, draft, sources, context) {
    // Симуляция улучшения ответа через LLM
    let refined = draft;
    
    if (sources.length > 1) {
      refined += `\n\nДополнительная информация: ${sources[1].content}`;
    }
    
    if (question.toLowerCase().includes('qr') || question.toLowerCase().includes('код')) {
      refined += '\n\nДля пополнения через QR-код: 1) Откройте мобильное приложение банка, 2) Выберите "Пополнить", 3) Отсканируйте QR-код, 4) Введите сумму и подтвердите операцию.';
    }
    
    return refined;
  }
}

const ragService = new MockRAGService();

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RAG Pipeline',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/rag/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'RAG Pipeline',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pipeline: {
        rephrase: 'active',
        hybridSearch: 'active',
        draftGeneration: 'active',
        refinement: 'active',
      },
    },
  });
});

app.post('/api/rag/query', async (req, res) => {
  try {
    const { question, context, userId, chatId, language, options } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Вопрос обязателен',
        code: 'MISSING_QUESTION',
      });
    }

    const response = await ragService.processQuery({
      question,
      context,
      userId,
      chatId,
      language: language || 'ru',
      options,
    });

    res.json({
      success: true,
      data: response,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error processing RAG query:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_ERROR',
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
        code: 'MISSING_TEST_QUERY',
      });
    }

    const response = await ragService.processQuery({
      question: testQuery,
      context: 'Тестовый запрос',
      language: 'ru',
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error testing RAG pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка тестирования',
      code: 'TEST_ERROR',
    });
  }
});

app.get('/api/rag/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalQueries: 0,
      averageResponseTime: 0,
      successRate: 100,
      lastQueryTime: null,
      pipelineStatus: 'active',
    },
  });
});

app.get('/api/rag/model-info', (req, res) => {
  res.json({
    success: true,
    data: {
      model: 'gpt-4o-mini',
      version: '1.0.0',
      capabilities: ['rephrase', 'draft', 'refine'],
      maxTokens: 4000,
      temperature: 0.3,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RAG Pipeline Server запущен на порту ${PORT}`);
  console.log(`📡 API доступен на http://localhost:${PORT}/api/rag`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Тестирование: http://localhost:${PORT}/api/rag/test`);
});
