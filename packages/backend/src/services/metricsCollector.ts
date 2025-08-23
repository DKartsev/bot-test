import { logInfo, logWarning, logError } from '../utils/logger';
import { cacheService } from './cache';
import { env } from '../config/env';

/**
 * Типы метрик
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Интерфейс для метрики
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
  description?: string;
}

/**
 * Интерфейс для гистограммы
 */
export interface HistogramData {
  count: number;
  sum: number;
  buckets: Map<number, number>;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Конфигурация сборщика метрик
 */
export interface MetricsConfig {
  enabled: boolean;
  retentionPeriod: number; // в миллисекундах
  batchSize: number;
  flushInterval: number; // в миллисекундах
  enableRedisStorage: boolean;
  enableMemoryStorage: boolean;
  histogramBuckets: number[];
}

/**
 * Статистика производительности API
 */
export interface ApiPerformanceStats {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  slowestEndpoints: Array<{
    path: string;
    method: string;
    averageTime: number;
    requestCount: number;
  }>;
  fastestEndpoints: Array<{
    path: string;
    method: string;
    averageTime: number;
    requestCount: number;
  }>;
  statusCodeDistribution: Record<string, number>;
  topUserAgents: Array<{
    userAgent: string;
    count: number;
  }>;
}

/**
 * Системные метрики
 */
export interface SystemMetrics {
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  uptime: number;
  nodeVersion: string;
  platform: string;
}

/**
 * Метрики базы данных
 */
export interface DatabaseMetrics {
  connectionCount: number;
  activeQueries: number;
  queryExecutionTime: HistogramData;
  slowQueries: Array<{
    query: string;
    executionTime: number;
    timestamp: number;
  }>;
  errorCount: number;
  transactionCount: number;
}

/**
 * Метрики Redis
 */
export interface RedisMetrics {
  isConnected: boolean;
  usedMemory: number;
  connectedClients: number;
  commandsProcessed: number;
  hitRate: number;
  missRate: number;
  keyCount: number;
  expiredKeys: number;
}

/**
 * Сервис для сбора и анализа метрик производительности
 */
export class MetricsCollectorService {
  private config: MetricsConfig;
  private metrics: Map<string, Metric[]> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.config = {
      enabled: env.metrics.enabled,
      retentionPeriod: env.metrics.retentionPeriod,
      batchSize: env.metrics.batchSize,
      flushInterval: env.metrics.flushInterval,
      enableRedisStorage: env.metrics.redisStorage,
      enableMemoryStorage: env.metrics.memoryStorage,
      histogramBuckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000],
    };

    this.startFlushTimer();
    logInfo('MetricsCollectorService инициализирован');
  }

  /**
   * Увеличение счетчика
   */
  incrementCounter(name: string, labels?: Record<string, string>, value = 1): void {
    if (!this.config.enabled) return;

    try {
      const key = this.generateKey(name, labels);
      const currentValue = this.counters.get(key) || 0;
      this.counters.set(key, currentValue + value);

      this.addMetric({
        name,
        type: MetricType.COUNTER,
        value: currentValue + value,
        labels,
        timestamp: Date.now(),
      });

      logInfo('Счетчик увеличен', { name, labels, value });
    } catch (error) {
      logError('Ошибка увеличения счетчика', { name, error });
    }
  }

  /**
   * Установка значения gauge
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    try {
      const key = this.generateKey(name, labels);
      this.gauges.set(key, value);

      this.addMetric({
        name,
        type: MetricType.GAUGE,
        value,
        labels,
        timestamp: Date.now(),
      });

      logInfo('Gauge установлен', { name, labels, value });
    } catch (error) {
      logError('Ошибка установки gauge', { name, error });
    }
  }

  /**
   * Добавление значения в гистограмму
   */
  addToHistogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;

    try {
      const key = this.generateKey(name, labels);
      const values = this.histograms.get(key) || [];
      values.push(value);
      this.histograms.set(key, values);

      this.addMetric({
        name,
        type: MetricType.HISTOGRAM,
        value,
        labels,
        timestamp: Date.now(),
      });

      logInfo('Значение добавлено в гистограмму', { name, labels, value });
    } catch (error) {
      logError('Ошибка добавления в гистограмму', { name, error });
    }
  }

  /**
   * Начало измерения времени
   */
  startTimer(name: string, labels?: Record<string, string>): () => void {
    const key = this.generateKey(name, labels);
    const startTime = Date.now();
    this.timers.set(key, startTime);

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.addToHistogram(name, duration, labels);
      this.timers.delete(key);
    };
  }

  /**
   * Получение статистики API
   */
  async getApiPerformanceStats(timeRange?: number): Promise<ApiPerformanceStats> {
    try {
      const range = timeRange || 60 * 60 * 1000; // 1 час по умолчанию
      const now = Date.now();
      const since = now - range;

      // Получаем метрики из разных источников
      const requestMetrics = this.getMetricsByNameAndTimeRange('http_requests_total', since, now);
      const responseTimeMetrics = this.getMetricsByNameAndTimeRange('http_request_duration', since, now);
      const errorMetrics = this.getMetricsByNameAndTimeRange('http_errors_total', since, now);

      // Вычисляем статистику
      const totalRequests = requestMetrics.reduce((sum, metric) => sum + metric.value, 0);
      const totalErrors = errorMetrics.reduce((sum, metric) => sum + metric.value, 0);
      
      const responseTimes = responseTimeMetrics.map(m => m.value);
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      const requestsPerSecond = totalRequests / (range / 1000);
      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

      // Группируем по endpoint'ам
      const endpointStats = new Map<string, { totalTime: number; count: number; errors: number }>();
      const statusCodes = new Map<string, number>();
      const userAgents = new Map<string, number>();

      requestMetrics.forEach(metric => {
        if (metric.labels) {
          const endpoint = `${metric.labels['method']} ${metric.labels['path']}`;
          const stats = endpointStats.get(endpoint) || { totalTime: 0, count: 0, errors: 0 };
          stats.count += metric.value;
          endpointStats.set(endpoint, stats);

          // Статистика кодов ответа
          if (metric.labels['status_code']) {
            const count = statusCodes.get(metric.labels['status_code']) || 0;
            statusCodes.set(metric.labels['status_code'], count + metric.value);
          }

          // Статистика User-Agent'ов
          if (metric.labels['user_agent']) {
            const count = userAgents.get(metric.labels['user_agent']) || 0;
            userAgents.set(metric.labels['user_agent'], count + 1);
          }
        }
      });

      responseTimeMetrics.forEach(metric => {
        if (metric.labels) {
          const endpoint = `${metric.labels['method']} ${metric.labels['path']}`;
          const stats = endpointStats.get(endpoint) || { totalTime: 0, count: 0, errors: 0 };
          stats.totalTime += metric.value;
          endpointStats.set(endpoint, stats);
        }
      });

      // Сортируем endpoint'ы по времени ответа
      const endpointArray = Array.from(endpointStats.entries()).map(([endpoint, stats]) => {
        const [method, path] = endpoint.split(' ', 2);
        return {
          path: path || '',
          method: method || '',
          averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
          requestCount: stats.count,
        };
      });

      const slowestEndpoints = endpointArray
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 10);

      const fastestEndpoints = endpointArray
        .filter(e => e.requestCount > 0)
        .sort((a, b) => a.averageTime - b.averageTime)
        .slice(0, 10);

      const statusCodeDistribution = Object.fromEntries(statusCodes);

      const topUserAgents = Array.from(userAgents.entries())
        .map(([userAgent, count]) => ({ userAgent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalRequests,
        totalErrors,
        averageResponseTime,
        requestsPerSecond,
        errorRate,
        slowestEndpoints,
        fastestEndpoints,
        statusCodeDistribution,
        topUserAgents,
      };
    } catch (error) {
      logError('Ошибка получения статистики API', error);
      throw error;
    }
  }

  /**
   * Получение системных метрик
   */
  getSystemMetrics(): SystemMetrics {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAverage = require('os').loadavg();
      
      return {
        memory: {
          used: memoryUsage.heapUsed,
          free: memoryUsage.heapTotal - memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          usage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to ms
          loadAverage,
        },
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
      };
    } catch (error) {
      logError('Ошибка получения системных метрик', error);
      throw error;
    }
  }

  /**
   * Получение метрик Redis
   */
  async getRedisMetrics(): Promise<RedisMetrics> {
    try {
      const info = await cacheService.getInfo();
      
      if (!info) {
        return {
          isConnected: false,
          usedMemory: 0,
          connectedClients: 0,
          commandsProcessed: 0,
          hitRate: 0,
          missRate: 0,
          keyCount: 0,
          expiredKeys: 0,
        };
      }
      
      return {
        isConnected: cacheService.isConnected(),
        usedMemory: parseInt(info['used_memory'] || '0', 10),
        connectedClients: parseInt(info['connected_clients'] || '0', 10),
        commandsProcessed: parseInt(info['total_commands_processed'] || '0', 10),
        hitRate: this.calculateHitRate(),
        missRate: this.calculateMissRate(),
        keyCount: parseInt(info['db0']?.split(',')[0]?.split('=')[1] || '0', 10),
        expiredKeys: parseInt(info['expired_keys'] || '0', 10),
      };
    } catch (error) {
      logError('Ошибка получения метрик Redis', error);
      return {
        isConnected: false,
        usedMemory: 0,
        connectedClients: 0,
        commandsProcessed: 0,
        hitRate: 0,
        missRate: 0,
        keyCount: 0,
        expiredKeys: 0,
      };
    }
  }

  /**
   * Получение гистограммы
   */
  getHistogram(name: string, labels?: Record<string, string>): HistogramData | null {
    try {
      const key = this.generateKey(name, labels);
      const values = this.histograms.get(key);
      
      if (!values || values.length === 0) {
        return null;
      }

      const sorted = values.slice().sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((acc, val) => acc + val, 0);
      const min = sorted[0];
      const max = sorted[count - 1];
      const avg = sum / count;

      const p50 = this.getPercentile(sorted, 50);
      const p95 = this.getPercentile(sorted, 95);
      const p99 = this.getPercentile(sorted, 99);

      // Создаем buckets
      const buckets = new Map<number, number>();
      for (const bucket of this.config.histogramBuckets) {
        const count = sorted.filter(val => val <= bucket).length;
        buckets.set(bucket, count);
      }

      return {
        count,
        sum,
        buckets,
        min,
        max,
        avg,
        p50,
        p95,
        p99,
      };
    } catch (error) {
      logError('Ошибка получения гистограммы', { name, error });
      return null;
    }
  }

  /**
   * Экспорт всех метрик
   */
  exportMetrics(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, HistogramData | null>;
    config: MetricsConfig;
    collectionTime: number;
  } {
    const counters = Object.fromEntries(this.counters);
    const gauges = Object.fromEntries(this.gauges);
    const histograms: Record<string, HistogramData | null> = {};

    for (const [key] of this.histograms) {
      histograms[key] = this.getHistogram(key);
    }

    return {
      counters,
      gauges,
      histograms,
      config: this.config,
      collectionTime: Date.now(),
    };
  }

  /**
   * Сброс всех метрик
   */
  resetMetrics(): void {
    try {
      this.metrics.clear();
      this.histograms.clear();
      this.counters.clear();
      this.gauges.clear();
      this.timers.clear();

      logInfo('Все метрики сброшены');
    } catch (error) {
      logError('Ошибка сброса метрик', error);
    }
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(updates: Partial<MetricsConfig>): void {
    try {
      this.config = { ...this.config, ...updates };
      
      if (updates.flushInterval) {
        this.restartFlushTimer();
      }

      logInfo('Конфигурация метрик обновлена', updates);
    } catch (error) {
      logError('Ошибка обновления конфигурации метрик', error);
    }
  }

  /**
   * Получение статистики коллектора
   */
  getCollectorStats(): {
    totalMetrics: number;
    totalCounters: number;
    totalGauges: number;
    totalHistograms: number;
    activeTimers: number;
    memoryUsage: number;
    config: MetricsConfig;
  } {
    let totalMetrics = 0;
    this.metrics.forEach(metrics => {
      totalMetrics += metrics.length;
    });

    return {
      totalMetrics,
      totalCounters: this.counters.size,
      totalGauges: this.gauges.size,
      totalHistograms: this.histograms.size,
      activeTimers: this.timers.size,
      memoryUsage: this.getCollectorMemoryUsage(),
      config: this.config,
    };
  }

  /**
   * Приватные методы
   */

  private addMetric(metric: Metric): void {
    const key = this.generateKey(metric.name, metric.labels);
    const metrics = this.metrics.get(key) || [];
    metrics.push(metric);
    this.metrics.set(key, metrics);

    // Очищаем старые метрики
    this.cleanupOldMetrics(key);
  }

  private generateKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `${name}{${labelString}}`;
  }

  private getMetricsByNameAndTimeRange(name: string, since: number, until: number): Metric[] {
    const allMetrics: Metric[] = [];

    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(name)) {
        const filteredMetrics = metrics.filter(
          metric => metric.timestamp >= since && metric.timestamp <= until
        );
        allMetrics.push(...filteredMetrics);
      }
    }

    return allMetrics;
  }

  private getPercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private calculateHitRate(): number {
    try {
      const hits = this.counters.get('redis_cache_hits') || 0;
      const misses = this.counters.get('redis_cache_misses') || 0;
      const total = hits + misses;
      
      return total > 0 ? (hits / total) * 100 : 0;
    } catch {
      return 0;
    }
  }

  private calculateMissRate(): number {
    try {
      const hits = this.counters.get('redis_cache_hits') || 0;
      const misses = this.counters.get('redis_cache_misses') || 0;
      const total = hits + misses;
      
      return total > 0 ? (misses / total) * 100 : 0;
    } catch {
      return 0;
    }
  }

  private cleanupOldMetrics(key: string): void {
    const metrics = this.metrics.get(key);
    if (!metrics) return;

    const cutoff = Date.now() - this.config.retentionPeriod;
    const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoff);
    
    if (filteredMetrics.length !== metrics.length) {
      this.metrics.set(key, filteredMetrics);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);
  }

  private restartFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.startFlushTimer();
  }

  private async flushMetrics(): Promise<void> {
    if (!this.config.enableRedisStorage) return;

    try {
      const timestamp = Date.now();
      const metricsToFlush: Metric[] = [];

      // Собираем все метрики для сброса
      for (const [key, metrics] of this.metrics) {
        const recentMetrics = metrics.filter(
          metric => timestamp - metric.timestamp < this.config.flushInterval
        );
        metricsToFlush.push(...recentMetrics);
      }

      if (metricsToFlush.length === 0) return;

      // Сохраняем в Redis батчами
      const batches = this.chunkArray(metricsToFlush, this.config.batchSize);
      
      for (const batch of batches) {
        const key = `metrics:batch:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
        await cacheService.set(key, JSON.stringify(batch), 24 * 60 * 60); // 24 часа
      }

      logInfo('Метрики сброшены в Redis', { 
        metricsCount: metricsToFlush.length, 
        batchCount: batches.length 
      });
    } catch (error) {
      logError('Ошибка сброса метрик', error);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private getCollectorMemoryUsage(): number {
    try {
      let size = 0;
      
      // Приблизительный подсчет памяти
      size += this.metrics.size * 100; // Примерный размер Map
      size += this.counters.size * 50;
      size += this.gauges.size * 50;
      size += this.histograms.size * 200; // Массивы занимают больше места
      size += this.timers.size * 30;

      return size;
    } catch {
      return 0;
    }
  }

  /**
   * Остановка сервиса
   */
  stop(): void {
    try {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }

      // Финальный сброс метрик
      this.flushMetrics();

      logInfo('MetricsCollectorService остановлен');
    } catch (error) {
      logError('Ошибка остановки MetricsCollectorService', error);
    }
  }
}

// Экспортируем единственный экземпляр
export const metricsCollector = new MetricsCollectorService();
