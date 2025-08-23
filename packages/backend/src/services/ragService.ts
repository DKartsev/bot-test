import { logError, logInfo, logWarning } from '../utils/logger';
import { OpenAIService } from './openai';
import { HybridSearchService } from './hybridSearch';
import type { 
  RAGQuery, 
  RAGResponse, 
  SearchResult, 
  QueryRephraseResult,
  DraftGenerationResult,
  RefinementResult 
} from '../types/rag';

export class RAGService {
  private openaiService: OpenAIService;
  private searchService: HybridSearchService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.searchService = new HybridSearchService();
  }

  /**
   * Основной пайплайн RAG
   */
  async processQuery(query: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();
    const searchStartTime = Date.now();

    try {
      logInfo('Начинаю обработку RAG запроса', { 
        question: query.question, 
        userId: query.userId,
        chatId: query.chatId 
      });

      // Шаг 1: Переформулировка запроса
      const rephraseResult = await this.rephraseQuery(query.question, query.context);
      logInfo('Запрос переформулирован', { 
        original: query.question, 
        rephrased: rephraseResult.rephrasedQuery,
        confidence: rephraseResult.confidence 
      });

      // Шаг 2: Гибридный поиск
      const searchResults = await this.performHybridSearch(rephraseResult.rephrasedQuery);
      const searchTime = Date.now() - searchStartTime;
      
      logInfo('Поиск завершен', { 
        query: rephraseResult.rephrasedQuery, 
        resultsCount: searchResults.length,
        searchTime 
      });

      // Шаг 3: Генерация черновика
      const draftResult = await this.generateDraft(query.question, searchResults, query.context);
      logInfo('Черновик сгенерирован', { 
        confidence: draftResult.confidence,
        searchStrategy: draftResult.searchStrategy 
      });

      // Шаг 4: RAG улучшение
      const refineResult = await this.refineAnswer(query.question, draftResult.draft, searchResults, query.context);
      const processingTime = Date.now() - searchStartTime;
      
      logInfo('Ответ улучшен', { 
        confidence: refineResult.confidence,
        changes: refineResult.changes.length 
      });

      const totalTime = Date.now() - startTime;

      // Формируем финальный ответ
      const response: RAGResponse = {
        answer: refineResult.refinedAnswer,
        sources: searchResults,
        confidence: Math.min(refineResult.confidence, draftResult.confidence),
        searchTime,
        processingTime,
        totalTime,
        metadata: {
          queryRephrased: rephraseResult.rephrasedQuery,
          searchStrategy: draftResult.searchStrategy,
          refineIterations: 1, // Пока одна итерация
          modelUsed: 'gpt-4o-mini',
        },
      };

      logInfo('RAG пайплайн завершен успешно', { 
        question: query.question,
        totalTime,
        confidence: response.confidence,
        sourcesCount: searchResults.length
      });

      return response;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      logError('Ошибка в RAG пайплайне', { 
        error, 
        question: query.question,
        totalTime 
      });

      // Возвращаем fallback ответ
      return this.createFallbackResponse(query.question, totalTime);
    }
  }

  /**
   * Переформулировка запроса
   */
  private async rephraseQuery(question: string, context?: string): Promise<QueryRephraseResult> {
    try {
      return await this.openaiService.rephraseQuery(question, context);
    } catch (error) {
      logWarning('Ошибка переформулировки, используем оригинальный запрос', { error, question });
      return {
        originalQuery: question,
        rephrasedQuery: question,
        intent: 'general',
        confidence: 0.5,
      };
    }
  }

  /**
   * Выполнение гибридного поиска
   */
  private async performHybridSearch(query: string): Promise<SearchResult[]> {
    try {
      // Получаем результаты векторного и ключевого поиска
      const [vectorResults, keywordResults] = await Promise.all([
        this.searchService.vectorSearch(query),
        this.searchService.keywordSearch(query),
      ]);

      // Объединяем результаты
      const hybridResults = await this.searchService.hybridSearch(query, vectorResults, keywordResults);

      // Если результатов нет, создаем fallback
      if (hybridResults.length === 0) {
        return this.createFallbackSearchResults(query);
      }

      return hybridResults;
    } catch (error) {
      logError('Ошибка гибридного поиска', { error, query });
      return this.createFallbackSearchResults(query);
    }
  }

  /**
   * Генерация черновика ответа
   */
  private async generateDraft(question: string, sources: SearchResult[], context?: string): Promise<DraftGenerationResult> {
    try {
      const draft = await this.openaiService.generateDraft(question, sources, context);
      
      return {
        draft,
        sources,
        searchStrategy: 'hybrid',
        confidence: this.calculateDraftConfidence(sources),
      };
    } catch (error) {
      logError('Ошибка генерации черновика', { error, question });
      return {
        draft: 'Извините, не удалось сгенерировать ответ. Попробуйте переформулировать вопрос.',
        sources,
        searchStrategy: 'fallback',
        confidence: 0.3,
      };
    }
  }

  /**
   * Улучшение ответа через RAG
   */
  private async refineAnswer(question: string, draft: string, sources: SearchResult[], context?: string): Promise<RefinementResult> {
    try {
      return await this.openaiService.refineAnswer(question, draft, sources, context);
    } catch (error) {
      logError('Ошибка улучшения ответа', { error, question });
      return {
        refinedAnswer: draft,
        confidence: 0.5,
        changes: ['Ошибка улучшения'],
        sourcesUsed: sources.map(s => s.id),
      };
    }
  }

  /**
   * Расчет уверенности черновика на основе источников
   */
  private calculateDraftConfidence(sources: SearchResult[]): number {
    if (sources.length === 0) return 0.1;
    
    const avgScore = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
    const countBonus = Math.min(sources.length * 0.1, 0.3);
    
    return Math.min(1.0, avgScore + countBonus);
  }

  /**
   * Создание fallback результатов поиска
   */
  private createFallbackSearchResults(query: string): SearchResult[] {
    return [{
      id: 'fallback',
      title: 'Общая информация',
      content: 'К сожалению, не удалось найти точную информацию по вашему запросу. Обратитесь к оператору поддержки для получения персональной помощи.',
      score: 0.1,
      source: 'hybrid',
      metadata: { fallback: true, query },
    }];
  }

  /**
   * Создание fallback ответа при ошибке
   */
  private createFallbackResponse(question: string, totalTime: number): RAGResponse {
    return {
      answer: 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте переформулировать вопрос или обратитесь к оператору поддержки.',
      sources: [],
      confidence: 0.1,
      searchTime: 0,
      processingTime: 0,
      totalTime,
      metadata: {
        queryRephrased: question,
        searchStrategy: 'fallback',
        refineIterations: 0,
        modelUsed: 'none',
      },
    };
  }

  /**
   * Тестирование RAG пайплайна
   */
  async testPipeline(testQuery: string): Promise<{ success: boolean; response?: RAGResponse; error?: string }> {
    try {
      const query: RAGQuery = {
        question: testQuery,
        language: 'ru',
        options: {
          temperature: 0.3,
          maxTokens: 2000,
          useHybridSearch: true,
        },
      };

      const response = await this.processQuery(query);
      
      return {
        success: true,
        response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Получение статистики пайплайна
   */
  getPipelineStats(): {
    openaiStatus: boolean;
    searchConfig: any;
    lastQueryTime?: Date;
  } {
    return {
      openaiStatus: false, // TODO: реализовать проверку статуса
      searchConfig: this.searchService.getConfig(),
    };
  }

  /**
   * Обновление конфигурации поиска
   */
  updateSearchConfig(config: any): void {
    this.searchService.updateConfig(config);
  }
}
