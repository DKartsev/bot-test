import { logError, logInfo } from '../utils/logger';
import type { SearchResult, HybridSearchConfig } from '../types/rag';

export class HybridSearchService {
  private config: HybridSearchConfig;

  constructor() {
    this.config = {
      vectorWeight: 0.7,
      keywordWeight: 0.3,
      semanticThreshold: 0.6,
      maxResults: 10,
      minScore: 0.3,
    };
  }

  /**
   * Гибридный поиск: векторный + ключевой
   */
  async hybridSearch(
    query: string, 
    vectorResults: SearchResult[], 
    keywordResults: SearchResult[]
  ): Promise<SearchResult[]> {
    try {
      logInfo('Начинаю гибридный поиск', { query, vectorCount: vectorResults.length, keywordCount: keywordResults.length });

      // Объединяем результаты
      const combinedResults = this.combineResults(vectorResults, keywordResults);
      
      // Ранжируем по релевантности
      const rankedResults = this.rankResults(combinedResults, query);
      
      // Фильтруем по минимальному порогу
      const filteredResults = rankedResults.filter(result => result.score >= this.config.minScore);
      
      // Ограничиваем количество результатов
      const finalResults = filteredResults.slice(0, this.config.maxResults);

      logInfo('Гибридный поиск завершен', { 
        query, 
        totalResults: finalResults.length,
        avgScore: finalResults.length > 0 ? finalResults.reduce((sum, r) => sum + r.score, 0) / finalResults.length : 0
      });

      return finalResults;
    } catch (error) {
      logError('Ошибка гибридного поиска', { error, query });
      // Возвращаем векторные результаты в случае ошибки
      return vectorResults.slice(0, this.config.maxResults);
    }
  }

  /**
   * Объединение результатов векторного и ключевого поиска
   */
  private combineResults(
    vectorResults: SearchResult[], 
    keywordResults: SearchResult[]
  ): Map<string, SearchResult> {
    const combined = new Map<string, SearchResult>();

    // Добавляем векторные результаты
    vectorResults.forEach(result => {
      combined.set(result.id, {
        ...result,
        source: 'hybrid',
        score: result.score * this.config.vectorWeight,
      });
    });

    // Добавляем или обновляем ключевые результаты
    keywordResults.forEach(result => {
      const existing = combined.get(result.id);
      if (existing) {
        // Объединяем оценки
        existing.score = (existing.score + result.score * this.config.keywordWeight) / 2;
        existing.metadata = {
          ...existing.metadata,
          keywordScore: result.score,
          vectorScore: existing.score / this.config.vectorWeight,
        };
      } else {
        combined.set(result.id, {
          ...result,
          source: 'hybrid',
          score: result.score * this.config.keywordWeight,
          metadata: {
            ...result.metadata,
            keywordScore: result.score,
            vectorScore: 0,
          },
        });
      }
    });

    return combined;
  }

  /**
   * Ранжирование результатов по релевантности
   */
  private rankResults(results: Map<string, SearchResult>, query: string): SearchResult[] {
    const resultsArray = Array.from(results.values());

    // Дополнительное ранжирование на основе содержимого
    resultsArray.forEach(result => {
      result.score = this.calculateRelevanceScore(result, query);
    });

    // Сортировка по убыванию релевантности
    return resultsArray.sort((a, b) => b.score - a.score);
  }

  /**
   * Расчет релевантности результата
   */
  private calculateRelevanceScore(result: SearchResult, query: string): number {
    let score = result.score;

    // Бонус за точное совпадение в заголовке
    if (result.title.toLowerCase().includes(query.toLowerCase())) {
      score += 0.2;
    }

    // Бонус за точное совпадение в содержимом
    if (result.content.toLowerCase().includes(query.toLowerCase())) {
      score += 0.1;
    }

    // Бонус за длину содержимого (предпочитаем более подробные ответы)
    const contentLength = result.content.length;
    if (contentLength > 100 && contentLength < 2000) {
      score += 0.05;
    }

    // Штраф за слишком короткие ответы
    if (contentLength < 50) {
      score -= 0.1;
    }

    // Штраф за слишком длинные ответы
    if (contentLength > 5000) {
      score -= 0.1;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Векторный поиск с использованием OpenAI embeddings
   */
  async vectorSearch(query: string): Promise<SearchResult[]> {
    try {
      logInfo('Начинаю векторный поиск', { query });
      
      // Генерируем embedding для запроса
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Ищем похожие документы по косинусному расстоянию
      const results: SearchResult[] = [];
      
      // TODO: Здесь должна быть интеграция с векторной БД (Pinecone, Weaviate, Qdrant)
      // Пока используем симуляцию на основе ключевых слов
      const mockDocuments = this.getMockDocuments();
      
      for (const doc of mockDocuments) {
        const docEmbedding = await this.generateEmbedding(doc.content);
        const similarity = this.calculateCosineSimilarity(queryEmbedding, docEmbedding);
        
        if (similarity > this.config.semanticThreshold) {
          results.push({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            score: similarity,
            source: 'vector',
            metadata: {
              similarity,
              embedding: docEmbedding,
            },
          });
        }
      }
      
      // Сортируем по релевантности
      results.sort((a, b) => b.score - a.score);
      
      logInfo('Векторный поиск завершен', { query, resultsCount: results.length });
      return results;
    } catch (error) {
      logError('Ошибка векторного поиска', { error, query });
      return [];
    }
  }

  /**
   * Ключевой поиск с полнотекстовым поиском
   */
  async keywordSearch(query: string): Promise<SearchResult[]> {
    try {
      logInfo('Начинаю ключевой поиск', { query });
      
      // Разбиваем запрос на ключевые слова
      const keywords = this.extractKeywords(query);
      
      // Ищем документы по ключевым словам
      const results: SearchResult[] = [];
      const mockDocuments = this.getMockDocuments();
      
      for (const doc of mockDocuments) {
        const score = this.calculateKeywordScore(doc, keywords);
        
        if (score > this.config.minScore) {
          results.push({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            score,
            source: 'keyword',
            metadata: {
              keywords,
              keywordScore: score,
            },
          });
        }
      }
      
      // Сортируем по релевантности
      results.sort((a, b) => b.score - a.score);
      
      logInfo('Ключевой поиск завершен', { query, resultsCount: results.length });
      return results;
    } catch (error) {
      logError('Ошибка ключевого поиска', { error, query });
      return [];
    }
  }

  /**
   * Генерация embedding для текста
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // TODO: Интеграция с OpenAI embeddings API
      // Пока используем простую хеш-функцию для симуляции
      const hash = this.simpleHash(text);
      const embedding = Array.from({ length: 1536 }, (_, i) => 
        Math.sin(hash + i) * 0.5 + 0.5
      );
      return embedding;
    } catch (error) {
      logError('Ошибка генерации embedding', { error, text });
      // Возвращаем нулевой вектор в случае ошибки
      return Array(1536).fill(0);
    }
  }

  /**
   * Вычисление косинусного сходства между векторами
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      const val1 = vec1[i] || 0;
      const val2 = vec2[i] || 0;
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Извлечение ключевых слов из запроса
   */
  private extractKeywords(query: string): string[] {
    // Простая реализация извлечения ключевых слов
    const stopWords = ['как', 'что', 'где', 'когда', 'почему', 'зачем', 'кто', 'какой', 'какая', 'какое', 'какие'];
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return [...new Set(words)];
  }

  /**
   * Вычисление оценки по ключевым словам
   */
  private calculateKeywordScore(doc: any, keywords: string[]): number {
    let score = 0;
    const docText = `${doc.title} ${doc.content}`.toLowerCase();
    
    for (const keyword of keywords) {
      if (docText.includes(keyword)) {
        score += 0.3;
        
        // Бонус за точное совпадение
        if (doc.title.toLowerCase().includes(keyword)) {
          score += 0.2;
        }
        
        // Бонус за частоту появления
        const frequency = (docText.match(new RegExp(keyword, 'g')) || []).length;
        score += Math.min(0.1 * frequency, 0.3);
      }
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Простая хеш-функция для симуляции
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Преобразуем в 32-битное целое
    }
    return Math.abs(hash);
  }

  /**
   * Получение тестовых документов для демонстрации
   */
  private getMockDocuments(): Array<{ id: string; title: string; content: string }> {
    return [
      {
        id: 'doc-1',
        title: 'Как пополнить баланс',
        content: 'Для пополнения баланса используйте QR-код, банковскую карту или наличные в терминале. QR-код можно отсканировать в мобильном приложении банка.',
      },
      {
        id: 'doc-2',
        title: 'Способы пополнения баланса',
        content: 'Доступные способы пополнения: 1) QR-код через мобильное приложение, 2) Банковская карта в терминале, 3) Наличные в терминале, 4) Перевод с банковского счета.',
      },
      {
        id: 'doc-3',
        title: 'Проблемы с пополнением',
        content: 'Если возникают проблемы с пополнением баланса, проверьте: корректность введенных данных, достаточность средств на карте, статус терминала.',
      },
      {
        id: 'doc-4',
        title: 'Безопасность пополнения',
        content: 'Все операции пополнения защищены SSL-шифрованием. Не передавайте данные карты третьим лицам. Используйте только официальные терминалы.',
      },
      {
        id: 'doc-5',
        title: 'Комиссии за пополнение',
        content: 'Пополнение баланса через QR-код и банковскую карту бесплатно. За пополнение наличными взимается комиссия 1% от суммы.',
      },
    ];
  }

  /**
   * Обновление конфигурации поиска
   */
  updateConfig(newConfig: Partial<HybridSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logInfo('Конфигурация гибридного поиска обновлена', { config: this.config });
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig(): HybridSearchConfig {
    return { ...this.config };
  }

  /**
   * Тестирование поиска
   */
  async testSearch(query: string): Promise<{ success: boolean; results: SearchResult[] }> {
    try {
      const vectorResults = await this.vectorSearch(query);
      const keywordResults = await this.keywordSearch(query);
      const hybridResults = await this.hybridSearch(query, vectorResults, keywordResults);

      return {
        success: true,
        results: hybridResults,
      };
    } catch (error) {
      logError('Ошибка тестирования поиска', { error, query });
      return {
        success: false,
        results: [],
      };
    }
  }
}
