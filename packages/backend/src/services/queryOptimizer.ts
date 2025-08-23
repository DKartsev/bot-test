import { logInfo, logError } from '../utils/logger';
import { env } from '../config/env';

/**
 * Результат анализа запроса
 */
export interface QueryAnalysisResult {
  query: string;
  executionTime: number;
  rowsReturned: number;
  rowsScanned: number;
  indexUsage: string[];
  suggestions: string[];
  warnings: string[];
  performance: 'excellent' | 'good' | 'poor' | 'critical';
}

/**
 * Статистика производительности запросов
 */
export interface QueryPerformanceStats {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: Array<{
    query: string;
    executionTime: number;
    timestamp: Date;
    frequency: number;
  }>;
  indexUsage: Record<string, number>;
  tableScans: number;
  indexScans: number;
}

/**
 * Конфигурация оптимизации
 */
export interface OptimizationConfig {
  slowQueryThreshold: number;        // Порог для медленных запросов (мс)
  enableQueryLogging: boolean;       // Логирование всех запросов
  enableExplainAnalysis: boolean;    // Анализ EXPLAIN для медленных запросов
  maxQueryLength: number;            // Максимальная длина запроса для логирования
  enableIndexRecommendations: boolean; // Рекомендации по индексам
  maxStoredQueries: number;          // Максимальное количество запросов для хранения статистики
  cleanupInterval: number;           // Интервал очистки статистики (мс)
}

/**
 * Сервис для оптимизации SQL запросов
 */
export class QueryOptimizerService {
  private config: OptimizationConfig;
  private queryStats: Map<string, QueryAnalysisResult> = new Map();
  private performanceStats: QueryPerformanceStats = {
    totalQueries: 0,
    averageExecutionTime: 0,
    slowQueries: [],
    indexUsage: {},
    tableScans: 0,
    indexScans: 0,
  };

  constructor() {
    this.config = {
      slowQueryThreshold: env.queryOptimization.slowQueryThreshold,
      enableQueryLogging: env.queryOptimization.enableQueryLogging,
      enableExplainAnalysis: env.queryOptimization.enableExplainAnalysis,
      maxQueryLength: env.queryOptimization.maxQueryLength,
      enableIndexRecommendations: env.queryOptimization.enableIndexRecommendations,
      maxStoredQueries: 1000,
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 часа
    };
  }

  /**
   * Анализ SQL запроса
   */
  async analyzeQuery(sql: string, params?: Record<string, unknown>): Promise<QueryAnalysisResult> {
    const startTime = Date.now();
    
    try {
      const analysis: QueryAnalysisResult = {
        query: this.truncateQuery(sql),
        executionTime: Date.now() - startTime,
        rowsReturned: 0, // Placeholder, actual values would need to be passed or fetched
        rowsScanned: 0, // Placeholder
        indexUsage: [], // Placeholder
        suggestions: [],
        warnings: [],
        performance: this.calculatePerformance(Date.now() - startTime, 0, 0), // Placeholder
      };

      // Анализируем запрос и даем рекомендации
      this.analyzeQueryStructure(sql, analysis);
      this.analyzePerformance(Date.now() - startTime, 0, 0, analysis); // Placeholder
      this.analyzeIndexUsage([], analysis); // Placeholder

      // Сохраняем статистику
      this.updateStats(analysis);

      // Логируем медленные запросы
      if (Date.now() - startTime > this.config.slowQueryThreshold) {
        this.logSlowQuery(analysis);
      }

      return analysis;
    } catch (error) {
      logError('Error analyzing query:', error);
      throw error;
    }
  }

  /**
   * Анализ структуры запроса
   */
  private analyzeQueryStructure(query: string, analysis: QueryAnalysisResult): void {
    const upperQuery = query.toUpperCase();

    // Проверяем SELECT *
    if (upperQuery.includes('SELECT *')) {
      analysis.warnings.push('Использование SELECT * может снижать производительность');
      analysis.suggestions.push('Укажите только необходимые колонки вместо SELECT *');
    }

    // Проверяем отсутствие LIMIT в больших выборках
    if (upperQuery.includes('SELECT') && !upperQuery.includes('LIMIT') && !upperQuery.includes('WHERE')) {
      analysis.warnings.push('Запрос без LIMIT может возвращать большое количество строк');
      analysis.suggestions.push('Добавьте LIMIT для ограничения количества возвращаемых строк');
    }

    // Проверяем использование LIKE с wildcard в начале
    if (upperQuery.includes('LIKE') && (query.includes("'%") || query.includes('"%'))) {
      analysis.warnings.push('LIKE с wildcard в начале не может использовать индексы');
      analysis.suggestions.push('Используйте полнотекстовый поиск или перестройте запрос');
    }

    // Проверяем отсутствие WHERE
    if (upperQuery.includes('SELECT') && !upperQuery.includes('WHERE') && !upperQuery.includes('JOIN')) {
      analysis.warnings.push('Запрос без WHERE может сканировать всю таблицу');
      analysis.suggestions.push('Добавьте условия WHERE для фильтрации данных');
    }

    // Проверяем использование ORDER BY без индекса
    if (upperQuery.includes('ORDER BY') && !upperQuery.includes('LIMIT')) {
      analysis.warnings.push('ORDER BY без LIMIT может сортировать большое количество строк');
      analysis.suggestions.push('Добавьте LIMIT или создайте индекс для колонок сортировки');
    }
  }

  /**
   * Анализ производительности
   */
  private analyzePerformance(
    executionTime: number,
    rowsScanned: number,
    rowsReturned: number,
    analysis: QueryAnalysisResult
  ): void {
    // Анализируем соотношение отсканированных и возвращенных строк
    if (rowsScanned > 0) {
      const efficiency = rowsReturned / rowsScanned;
      
      if (efficiency < 0.1) {
        analysis.warnings.push('Низкая эффективность: много строк сканируется, мало возвращается');
        analysis.suggestions.push('Оптимизируйте WHERE условия или создайте составные индексы');
      }
    }

    // Анализируем время выполнения
    if (executionTime > this.config.slowQueryThreshold) {
      analysis.warnings.push(`Запрос выполняется медленно: ${executionTime}ms`);
      analysis.suggestions.push('Рассмотрите возможность кэширования или оптимизации запроса');
    }

    // Анализируем количество строк
    if (rowsReturned > 1000) {
      analysis.warnings.push('Запрос возвращает большое количество строк');
      analysis.suggestions.push('Используйте пагинацию или ограничьте результат LIMIT');
    }
  }

  /**
   * Анализ использования индексов
   */
  private analyzeIndexUsage(indexUsage: string[], analysis: QueryAnalysisResult): void {
    if (indexUsage.length === 0) {
      analysis.warnings.push('Запрос не использует индексы');
      analysis.suggestions.push('Создайте индексы для колонок в WHERE, ORDER BY, JOIN');
    } else {
      analysis.suggestions.push(`Используются индексы: ${indexUsage.join(', ')}`);
    }
  }

  /**
   * Расчет производительности
   */
  private calculatePerformance(
    executionTime: number,
    rowsScanned: number,
    rowsReturned: number
  ): 'excellent' | 'good' | 'poor' | 'critical' {
    if (executionTime < 100 && rowsScanned <= rowsReturned * 2) {
      return 'excellent';
    } else if (executionTime < 500 && rowsScanned <= rowsReturned * 5) {
      return 'good';
    } else if (executionTime < 2000) {
      return 'poor';
    } else {
      return 'critical';
    }
  }

  /**
   * Обновление статистики
   */
  private updateStats(analysis: QueryAnalysisResult): void {
    this.performanceStats.totalQueries++;
    
    // Обновляем среднее время выполнения
    const totalTime = this.performanceStats.averageExecutionTime * (this.performanceStats.totalQueries - 1);
    this.performanceStats.averageExecutionTime = (totalTime + analysis.executionTime) / this.performanceStats.totalQueries;

    // Обновляем статистику по индексам
    analysis.indexUsage.forEach(index => {
      this.performanceStats.indexUsage[index] = (this.performanceStats.indexUsage[index] || 0) + 1;
    });

    // Обновляем счетчики сканирования
    if (analysis.indexUsage.length > 0) {
      this.performanceStats.indexScans++;
    } else {
      this.performanceStats.tableScans++;
    }

    // Обновляем список медленных запросов
    if (analysis.executionTime > this.config.slowQueryThreshold) {
      this.updateSlowQueries(analysis);
    }
  }

  /**
   * Обновление списка медленных запросов
   */
  private updateSlowQueries(analysis: QueryAnalysisResult): void {
    const existingIndex = this.performanceStats.slowQueries.findIndex(
      sq => sq.query === analysis.query
    );

    if (existingIndex >= 0) {
      // Обновляем существующий запрос
      this.performanceStats.slowQueries[existingIndex].executionTime = Math.max(
        this.performanceStats.slowQueries[existingIndex].executionTime,
        analysis.executionTime
      );
      this.performanceStats.slowQueries[existingIndex].frequency++;
      this.performanceStats.slowQueries[existingIndex].timestamp = new Date();
    } else {
      // Добавляем новый запрос
      this.performanceStats.slowQueries.push({
        query: analysis.query,
        executionTime: analysis.executionTime,
        timestamp: new Date(),
        frequency: 1,
      });
    }

    // Сортируем по времени выполнения и оставляем топ-20
    this.performanceStats.slowQueries.sort((a, b) => b.executionTime - a.executionTime);
    if (this.performanceStats.slowQueries.length > 20) {
      this.performanceStats.slowQueries = this.performanceStats.slowQueries.slice(0, 20);
    }
  }

  /**
   * Логирование медленного запроса
   */
  private logSlowQuery(analysis: QueryAnalysisResult): void {
    // logWarning('Медленный SQL запрос обнаружен', {
    //   query: analysis.query,
    //   executionTime: analysis.executionTime,
    //   rowsReturned: analysis.rowsReturned,
    //   rowsScanned: analysis.rowsScanned,
    //   performance: analysis.performance,
    //   suggestions: analysis.suggestions,
    // });
  }

  /**
   * Получение статистики производительности
   */
  getPerformanceStats(): QueryPerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * Получение анализа конкретного запроса
   */
  getQueryAnalysis(query: string): QueryAnalysisResult | undefined {
    return this.queryStats.get(this.truncateQuery(query));
  }

  /**
   * Получение рекомендаций по индексам
   */
  getIndexRecommendations(): string[] {
    const recommendations: string[] = [];

    // Анализируем медленные запросы и даем рекомендации
    this.performanceStats.slowQueries.forEach(slowQuery => {
      if (slowQuery.frequency > 3) {
        recommendations.push(
          `Часто выполняемый медленный запрос: ${slowQuery.query.substring(0, 100)}... - рассмотрите создание индекса`
        );
      }
    });

    // Рекомендации на основе статистики
    if (this.performanceStats.tableScans > this.performanceStats.indexScans) {
      recommendations.push('Много table scans - рассмотрите создание индексов для часто используемых колонок');
    }

    return recommendations;
  }

  /**
   * Сброс статистики
   */
  resetStats(): void {
    this.queryStats.clear();
    this.performanceStats = {
      totalQueries: 0,
      averageExecutionTime: 0,
      slowQueries: [],
      indexUsage: {},
      tableScans: 0,
      indexScans: 0,
    };
    logInfo('Статистика производительности SQL запросов сброшена');
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(updates: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...updates };
    logInfo('Конфигурация QueryOptimizer обновлена', updates);
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Обрезка длинного запроса для логирования
   */
  private truncateQuery(query: string): string {
    if (query.length <= this.config.maxQueryLength) {
      return query;
    }
    return query.substring(0, this.config.maxQueryLength) + '...';
  }
}

// Экспортируем единственный экземпляр
export const queryOptimizerService = new QueryOptimizerService();
