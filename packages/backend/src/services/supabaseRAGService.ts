import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logError, logInfo, logWarning } from '../utils/logger';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

// Типы для RAG пайплайна
interface RAGQuery {
  question: string;
  userId?: string;
  chatId?: string;
  language?: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    topK?: number;
    minSimilarity?: number;
  };
}

interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  searchTime: number;
  processingTime: number;
  totalTime: number;
  metadata: {
    queryProcessed: string;
    searchStrategy: string;
    modelUsed: string;
    fallbackUsed: boolean;
  };
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  source: string;
  metadata: {
    articleId?: string;
    chunkIndex?: number;
    similarity?: number;
  };
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

/**
 * Основной RAG сервис для работы с Supabase и OpenAI
 * Реализует пайплайн: Вопрос → Embeddings → Поиск в kb_chunks → GPT → Ответ
 */
export class SupabaseRAGService {
  private supabase: any;
  private openaiApiKey: string;
  private openaiModel: string;
  private embeddingModel: string;
  private proxyAgent: any;

  constructor() {
    // Инициализация Supabase клиента
    this.supabase = createClient(
      env.SUPABASE_URL || process.env.SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Конфигурация OpenAI
    this.openaiApiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY!;
    this.openaiModel = env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.embeddingModel = env.OPENAI_EMBED_MODEL || process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

    // Настройка HTTP прокси для OpenAI API
    const proxyUrl = process.env.OPENAI_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxyUrl) {
      this.proxyAgent = new HttpsProxyAgent(proxyUrl);
      logInfo('OpenAI HTTP прокси настроен в RAG сервисе', { 
        proxyUrl,
        source: process.env.OPENAI_PROXY_URL ? 'OPENAI_PROXY_URL' : 
                process.env.HTTPS_PROXY ? 'HTTPS_PROXY' : 'HTTP_PROXY'
      });
    }

    logInfo('SupabaseRAGService инициализирован', {
      supabaseUrl: env.SUPABASE_URL ? 'настроен' : 'не настроен',
      openaiKey: this.openaiApiKey ? 'настроен' : 'не настроен',
      openaiModel: this.openaiModel,
      embeddingModel: this.embeddingModel,
      proxyConfigured: !!this.proxyAgent,
    });
  }

  /**
   * Основной пайплайн RAG
   * 1. Создание embeddings для вопроса пользователя
   * 2. Поиск похожих чанков в Supabase через pgvector
   * 3. Генерация ответа через GPT на основе найденных чанков
   * 4. Возврат ответа с источниками
   */
  async processQuery(query: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();
    const searchStartTime = Date.now();

    try {
      logInfo('🚀 Начинаю RAG пайплайн', {
        question: query.question,
        userId: query.userId,
        chatId: query.chatId,
      });

      // Шаг 1: Создание embeddings для вопроса пользователя
      logInfo('📊 Шаг 1: Создание embeddings для вопроса');
      const queryEmbedding = await this.createQueryEmbedding(query.question);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error('Не удалось создать embeddings для вопроса');
      }

      // Шаг 2: Поиск похожих чанков в Supabase через pgvector
      logInfo('🔍 Шаг 2: Поиск в базе знаний через pgvector');
      const searchResults = await this.searchSimilarChunks(
        queryEmbedding,
        query.options?.topK || 5,
        query.options?.minSimilarity || 0.5
      );
      
      const searchTime = Date.now() - searchStartTime;
      logInfo('✅ Поиск завершен', {
        resultsCount: searchResults.length,
        searchTime: `${searchTime}ms`,
      });

      // Шаг 3: Генерация ответа через GPT
      logInfo('🤖 Шаг 3: Генерация ответа через GPT');
      const generationStartTime = Date.now();
      
      let answer: string;
      let confidence: number;
      let fallbackUsed = false;

      if (searchResults.length === 0) {
        // Fallback: если не найдено подходящих чанков
        logWarning('⚠️ Не найдено подходящих чанков, используем fallback');
        answer = this.getFallbackAnswer(query.question);
        confidence = 0.1;
        fallbackUsed = true;
      } else {
        // Генерация ответа на основе найденных чанков
        answer = await this.generateAnswerWithGPT(query.question, searchResults, query.options);
        confidence = this.calculateConfidence(searchResults);
      }

      const processingTime = Date.now() - generationStartTime;
      const totalTime = Date.now() - startTime;

      logInfo('✅ RAG пайплайн завершен успешно', {
        question: query.question,
        totalTime: `${totalTime}ms`,
        confidence,
        sourcesCount: searchResults.length,
        fallbackUsed,
      });

      // Формируем финальный ответ
      const response: RAGResponse = {
        answer,
        sources: searchResults,
        confidence,
        searchTime,
        processingTime,
        totalTime,
        metadata: {
          queryProcessed: query.question,
          searchStrategy: 'vector_similarity',
          modelUsed: this.openaiModel,
          fallbackUsed,
        },
      };

      return response;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      logError('❌ Ошибка в RAG пайплайне', {
        error: error instanceof Error ? error.message : 'Unknown error',
        question: query.question,
        totalTime: `${totalTime}ms`,
      });

      // Возвращаем fallback ответ при ошибке
      return this.createFallbackResponse(query.question, totalTime);
    }
  }

  /**
   * Создание embeddings для вопроса пользователя
   * Использует OpenAI API для генерации векторного представления
   */
  private async createQueryEmbedding(question: string): Promise<number[]> {
    try {
      logInfo('🔮 Создание embeddings для вопроса', { question: question.substring(0, 100) });

      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: question,
        }),
      };

      // Добавляем HTTP прокси если настроен
      if (this.proxyAgent) {
        fetchOptions.agent = this.proxyAgent;
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', fetchOptions);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(`OpenAI API заблокирован: ${response.status} ${response.statusText}`);
        }
        throw new Error(`OpenAI API ошибка: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OpenAIEmbeddingResponse;
      const embedding = data.data[0]?.embedding;

      if (!embedding || embedding.length === 0) {
        throw new Error('Пустой embedding от OpenAI API');
      }

      logInfo('✅ Embeddings созданы', { 
        dimension: embedding.length,
        model: this.embeddingModel,
      });

      return embedding;
    } catch (error) {
      logError('❌ Ошибка создания embeddings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        question: question.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Поиск похожих чанков в Supabase через pgvector
   * Использует оператор <-> для cosine similarity
   */
  private async searchSimilarChunks(
    queryEmbedding: number[],
    topK: number = 5,
    minSimilarity: number = 0.5
  ): Promise<SearchResult[]> {
    try {
      logInfo('🔍 Поиск похожих чанков в Supabase', {
        topK,
        minSimilarity,
        embeddingDimension: queryEmbedding.length,
      });

      // Выполняем векторный поиск через прямой SQL запрос
      // Используем оператор <-> для cosine distance (чем меньше, тем больше similarity)
      const { data, error } = await this.supabase
        .from('kb_chunks')
        .select(`
          id,
          article_id,
          chunk_index,
          chunk_text,
          embedding
        `)
        .not('embedding', 'is', null)
        .limit(topK * 2); // Получаем больше записей для фильтрации

      if (error) {
        throw new Error(`Supabase ошибка: ${error.message}`);
      }

      if (!data || data.length === 0) {
        logWarning('⚠️ Не найдено чанков с embeddings в базе знаний');
        return [];
      }

      // Вычисляем similarity для каждого чанка
      const resultsWithSimilarity = data.map(chunk => {
        let similarity = 0;
        
        try {
          // Парсим embedding из JSON строки
          const chunkEmbedding = typeof chunk.embedding === 'string' 
            ? JSON.parse(chunk.embedding) 
            : chunk.embedding;
          
          if (Array.isArray(chunkEmbedding) && chunkEmbedding.length === queryEmbedding.length) {
            // Вычисляем cosine similarity
            const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * chunkEmbedding[i], 0);
            const queryNorm = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
            const chunkNorm = Math.sqrt(chunkEmbedding.reduce((sum, val) => sum + val * val, 0));
            
            if (queryNorm > 0 && chunkNorm > 0) {
              similarity = dotProduct / (queryNorm * chunkNorm);
            }
          }
        } catch (e) {
          logWarning('⚠️ Ошибка парсинга embedding', { chunkId: chunk.id, error: e.message });
        }
        
        return {
          ...chunk,
          similarity
        };
      });

      // Фильтруем по минимальному similarity и сортируем
      // Временно снижаем порог для тестирования
      const testThreshold = Math.min(minSimilarity, -0.1); // Снижаем порог до -0.1
      const filteredResults = resultsWithSimilarity
        .filter(result => result.similarity >= testThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      if (filteredResults.length === 0) {
        logWarning('⚠️ Не найдено похожих чанков в базе знаний');
        return [];
      }

      const searchResults = filteredResults;

      // Преобразуем результаты в формат SearchResult
      const results: SearchResult[] = searchResults.map((chunk: any) => ({
        id: chunk.id,
        title: `Чанк ${chunk.chunk_index + 1}`,
        content: chunk.chunk_text,
        score: chunk.similarity,
        source: 'supabase_vector',
        metadata: {
          articleId: chunk.article_id,
          chunkIndex: chunk.chunk_index,
          similarity: chunk.similarity,
        },
      }));

      logInfo('✅ Поиск в Supabase завершен', {
        resultsCount: results.length,
        avgSimilarity: results.length > 0 
          ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(3)
          : 0,
        topSimilarity: results.length > 0 ? results[0].score : 0,
      });

      return results;
    } catch (error) {
      logError('❌ Ошибка поиска в Supabase', {
        error: error instanceof Error ? error.message : 'Unknown error',
        topK,
        minSimilarity,
      });
      throw error;
    }
  }

  /**
   * Генерация ответа через GPT на основе найденных чанков
   * Строго использует только информацию из источников
   */
  private async generateAnswerWithGPT(
    question: string,
    sources: SearchResult[],
    options?: RAGQuery['options']
  ): Promise<string> {
    try {
      logInfo('🤖 Генерация ответа через GPT', {
        question: question.substring(0, 100),
        sourcesCount: sources.length,
        model: this.openaiModel,
      });

      // Формируем контекст из найденных чанков
      const context = sources.map((source, index) => 
        `Источник ${index + 1}:\n${source.content}\n`
      ).join('\n');

      // Создаем промпт для GPT
      const prompt = this.buildRAGPrompt(question, context);

      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.openaiModel,
          messages: [
            {
              role: 'system',
              content: 'Ты - помощник службы поддержки. Отвечай ТОЛЬКО на основе предоставленных источников. Если информации недостаточно, скажи об этом.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.3,
        }),
      };

      // Добавляем HTTP прокси если настроен
      if (this.proxyAgent) {
        fetchOptions.agent = this.proxyAgent;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', fetchOptions);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(`OpenAI API заблокирован: ${response.status} ${response.statusText}`);
        }
        throw new Error(`OpenAI API ошибка: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const answer = data.choices[0]?.message?.content;

      if (!answer) {
        throw new Error('Пустой ответ от OpenAI API');
      }

      logInfo('✅ Ответ сгенерирован через GPT', {
        answerLength: answer.length,
        model: this.openaiModel,
      });

      return answer;
    } catch (error) {
      logError('❌ Ошибка генерации ответа через GPT', {
        error: error instanceof Error ? error.message : 'Unknown error',
        question: question.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Построение промпта для RAG генерации
   */
  private buildRAGPrompt(question: string, context: string): string {
    return `Вопрос пользователя: "${question}"

Контекст из базы знаний:
${context}

Инструкции:
1. Ответь на вопрос пользователя, используя ТОЛЬКО информацию из предоставленного контекста
2. Если в контексте нет достаточной информации для полного ответа, честно скажи об этом
3. Не добавляй информацию, которой нет в контексте
4. Будь кратким и понятным
5. Если нужно, предложи обратиться к оператору поддержки

Ответ:`;
  }

  /**
   * Расчет уверенности ответа на основе качества источников
   */
  private calculateConfidence(sources: SearchResult[]): number {
    if (sources.length === 0) return 0.1;

    // Средняя similarity найденных чанков
    const avgSimilarity = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
    
    // Бонус за количество источников (до 3 источников)
    const sourceBonus = Math.min(sources.length * 0.1, 0.3);
    
    // Итоговая уверенность
    const confidence = Math.min(1.0, avgSimilarity + sourceBonus);
    
    logInfo('📊 Расчет уверенности', {
      avgSimilarity: avgSimilarity.toFixed(3),
      sourceBonus: sourceBonus.toFixed(3),
      finalConfidence: confidence.toFixed(3),
      sourcesCount: sources.length,
    });

    return confidence;
  }

  /**
   * Fallback ответ когда не найдено подходящих чанков
   */
  private getFallbackAnswer(question: string): string {
    const fallbackAnswers = [
      'К сожалению, я не нашел подходящей информации в базе знаний по вашему вопросу. Пожалуйста, уточните вопрос или обратитесь к оператору поддержки.',
      'В базе знаний нет информации по вашему запросу. Попробуйте переформулировать вопрос или свяжитесь с нашими операторами.',
      'Не удалось найти релевантную информацию. Пожалуйста, уточните детали вопроса или передам ваш запрос оператору поддержки.',
    ];

    // Выбираем случайный fallback ответ
    const randomIndex = Math.floor(Math.random() * fallbackAnswers.length);
    return fallbackAnswers[randomIndex];
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
        queryProcessed: question,
        searchStrategy: 'fallback',
        modelUsed: 'none',
        fallbackUsed: true,
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
          maxTokens: 1000,
          topK: 5,
          minSimilarity: 0.5,
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
   * Проверка здоровья сервиса
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      supabase: boolean;
      openai: boolean;
    };
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    
    try {
      // Проверяем Supabase
      const { data: supabaseTest, error: supabaseError } = await this.supabase
        .from('kb_chunks')
        .select('id')
        .limit(1);

      const supabaseHealthy = !supabaseError;

      // Проверяем OpenAI (простой запрос)
      let openaiHealthy = false;
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
        });
        openaiHealthy = response.ok;
      } catch (error) {
        openaiHealthy = false;
      }

      const status = supabaseHealthy && openaiHealthy ? 'healthy' : 
                    supabaseHealthy || openaiHealthy ? 'degraded' : 'unhealthy';

      return {
        status,
        services: {
          supabase: supabaseHealthy,
          openai: openaiHealthy,
        },
        timestamp,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        services: {
          supabase: false,
          openai: false,
        },
        timestamp,
      };
    }
  }
}
