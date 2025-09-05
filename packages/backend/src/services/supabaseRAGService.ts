import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logError, logInfo, logWarning } from '../utils/logger';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import { createHash } from 'crypto';

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
  private searchCache: Map<string, { results: SearchResult[], timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут

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

    // Инициализация кэша
    this.searchCache = new Map();

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
      const topK = query.options?.topK || 5;
      const minSimilarity = query.options?.minSimilarity || 0.5;
      
      // Создаем ключ кэша
      const cacheKey = this.createCacheKey(query.question, topK * 3, minSimilarity);
      
      // Кэшированный поиск
      const initialResults = await this.cachedSearch(cacheKey, () =>
        this.searchSimilarChunks(
          queryEmbedding,
          topK * 3, // Получаем больше кандидатов для MMR
          minSimilarity,
          query.question
        )
      );

      // Применяем MMR для разнообразия результатов
      const searchResults = this.applyMMR(
        initialResults,
        queryEmbedding,
        topK,
        0.75 // lambda = 0.75 (баланс релевантности и разнообразия)
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

      // Логируем запрос в базу данных
      await this.logRAGRequest(
        query.question,
        topK,
        minSimilarity,
        searchResults.length,
        searchTime,
        processingTime,
        totalTime,
        confidence
      );

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
          searchStrategy: 'hybrid_vector_text',
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
   * Нормализация вектора до единичной нормы (важно для cosine similarity)
   */
  private l2Normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vec.map(val => val / norm);
  }

  /**
   * Создание хеша для кэширования
   */
  private createCacheKey(question: string, topK: number, minSimilarity: number): string {
    const hash = createHash('md5').update(question.toLowerCase().trim()).digest('hex');
    return `rag:${hash}:k${topK}:s${minSimilarity}`;
  }

  /**
   * Кэшированный поиск
   */
  private async cachedSearch(
    cacheKey: string,
    searchFn: () => Promise<SearchResult[]>
  ): Promise<SearchResult[]> {
    const cached = this.searchCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      logInfo('🎯 Кэш попадание', { cacheKey: cacheKey.substring(0, 20) + '...' });
      return cached.results;
    }

    const results = await searchFn();
    this.searchCache.set(cacheKey, { results, timestamp: now });
    
    // Очищаем старые записи из кэша
    if (this.searchCache.size > 100) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }

    return results;
  }

  /**
   * Логирование RAG запроса
   */
  private async logRAGRequest(
    question: string,
    topK: number,
    minSimilarity: number,
    resultsCount: number,
    searchTime: number,
    llmTime: number,
    totalTime: number,
    confidence: number
  ): Promise<void> {
    try {
      const questionHash = createHash('md5').update(question.toLowerCase().trim()).digest('hex');
      
      await this.supabase.from('rag_logs').insert({
        question_hash: questionHash,
        question_text: question.substring(0, 500), // Ограничиваем длину
        top_k: topK,
        min_similarity: minSimilarity,
        results_count: resultsCount,
        search_time_ms: searchTime,
        llm_time_ms: llmTime,
        total_time_ms: totalTime,
        model_used: this.openaiModel,
        confidence: confidence
      });
    } catch (error) {
      logWarning('⚠️ Ошибка логирования RAG запроса', { error: error.message });
    }
  }

  /**
   * MMR (Maximal Marginal Relevance) для разнообразия результатов
   * Уменьшает дубликаты смыслов в топ-K результатах
   */
  private applyMMR(
    candidates: SearchResult[],
    queryEmbedding: number[],
    k: number,
    lambda: number = 0.7
  ): SearchResult[] {
    if (candidates.length <= k) {
      return candidates;
    }

    const selected: SearchResult[] = [];
    const remaining = [...candidates];

    // Простая функция для вычисления текстового сходства
    const textSimilarity = (a: string, b: string): number => {
      const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
      const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
      const intersection = [...wordsA].filter(word => wordsB.has(word)).length;
      return intersection / Math.max(1, Math.min(wordsA.size, wordsB.size));
    };

    while (selected.length < k && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const relevance = remaining[i].score; // Релевантность (similarity)
        
        // Вычисляем максимальное сходство с уже выбранными
        const maxSimilarity = selected.length === 0 
          ? 0 
          : Math.max(...selected.map(s => textSimilarity(s.content, remaining[i].content)));

        // MMR формула: lambda * relevance - (1 - lambda) * max_similarity
        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    logInfo('🎯 MMR переранжирование применено', {
      originalCount: candidates.length,
      selectedCount: selected.length,
      lambda,
      avgRelevance: selected.reduce((sum, s) => sum + s.score, 0) / selected.length
    });

    return selected;
  }

  /**
   * Поиск похожих чанков через pgvector RPC функцию
   * Использует гибридный поиск: векторный + текстовый
   */
  private async searchSimilarChunks(
    queryEmbedding: number[],
    topK: number = 5,
    minSimilarity: number = 0.5,
    questionText?: string
  ): Promise<SearchResult[]> {
    try {
      logInfo('🔍 Гибридный поиск через pgvector RPC', {
        topK,
        minSimilarity,
        embeddingDimension: queryEmbedding.length,
        hasQuestionText: !!questionText,
      });

      // Нормализуем вектор запроса
      const normalizedQuery = this.l2Normalize(queryEmbedding);

      // Вызываем RPC функцию для гибридного поиска
      const { data, error } = await this.supabase.rpc('rag_hybrid_search', {
        q_vec: normalizedQuery,
        q_text: questionText || '',
        k: topK,
        min_sim: minSimilarity
      });

      if (error) {
        logError('❌ Ошибка RPC поиска', { error: error.message });
        throw new Error(`Supabase RPC ошибка: ${error.message}`);
      }

      if (!data || data.length === 0) {
        logWarning('⚠️ Не найдено похожих чанков в базе знаний');
        return [];
      }

      // Преобразуем результаты в формат SearchResult
      const results: SearchResult[] = data.map((row: any, index: number) => ({
        id: row.id,
        title: `Чанк ${row.chunk_index + 1}`,
        content: row.chunk_text,
        score: row.cos_sim, // Используем cosine similarity для прозрачности
        source: 'supabase_hybrid',
        metadata: {
          articleId: row.article_id,
          chunkIndex: row.chunk_index,
          similarity: row.cos_sim,
          tsRank: row.ts_rank_score,
          hybrid: row.hybrid_score,
          rank: index + 1
        },
      }));

      logInfo('✅ Гибридный поиск завершен', {
        resultsCount: results.length,
        avgSimilarity: results.length > 0 
          ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(3)
          : 0,
        topSimilarity: results.length > 0 ? results[0].score : 0,
        avgHybridScore: results.length > 0 
          ? (results.reduce((sum, r) => sum + (r.metadata as any).hybrid, 0) / results.length).toFixed(3)
          : 0,
      });

      return results;
    } catch (error) {
      logError('❌ Ошибка гибридного поиска', {
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

      // Создаем промпт для GPT с источниками
      const prompt = this.buildRAGPrompt(question, sources);

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
              content: 'Отвечай в строгом соответствии с инструкциями. Возвращай только валидный JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: options?.maxTokens || 700,
          temperature: options?.temperature || 0.2,
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
      const rawAnswer = data.choices[0]?.message?.content;

      if (!rawAnswer) {
        throw new Error('Пустой ответ от OpenAI API');
      }

      // Пытаемся распарсить JSON ответ
      let answer: string;
      try {
        const parsed = JSON.parse(rawAnswer);
        if (parsed.answer) {
          answer = parsed.answer;
          // Добавляем цитаты если есть
          if (parsed.citations && parsed.citations.length > 0) {
            const citations = parsed.citations.map((c: any) => 
              `[Источник ${c.source}] ${c.quote}`
            ).join('\n');
            answer += `\n\nЦитаты:\n${citations}`;
          }
          if (parsed.notes) {
            answer += `\n\nПримечание: ${parsed.notes}`;
          }
        } else {
          answer = rawAnswer;
        }
      } catch (e) {
        // Если не JSON, возвращаем как есть
        answer = rawAnswer;
      }

      logInfo('✅ Ответ сгенерирован через GPT', {
        answerLength: answer.length,
        model: this.openaiModel,
        isJson: rawAnswer.startsWith('{'),
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
   * Построение улучшенного промпта для RAG генерации с цитатами
   */
  private buildRAGPrompt(question: string, sources: SearchResult[]): string {
    const context = sources.map((source, index) => 
      `Источник ${index + 1} (similarity=${source.score.toFixed(3)}):\n${source.content}`
    ).join('\n\n');

    return `Ты — ассистент службы поддержки. Отвечай строго по источникам ниже. Если данных недостаточно — скажи об этом и предложи эскалацию.

=== ИСТОЧНИКИ ===
${context}

=== ЗАДАНИЕ ===
1) Дай точный, краткий ответ пользователю.
2) Приведи нумерованные цитаты с указанием "Источник N".
3) Ничего не выдумывай вне источников.
4) Верни JSON с полями:
{
  "answer": "краткий ответ",
  "citations": [{"source": N, "quote": "короткая цитата"}],
  "notes": "при необходимости"
}

Вопрос пользователя: "${question}"`;
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
