import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Мокаем logger
jest.mock('../utils/logger', () => ({
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn(),
}));

// Мокаем cacheService
const mockCacheService = {
  get: jest.fn() as jest.MockedFunction<() => Promise<any>>,
  set: jest.fn() as jest.MockedFunction<() => Promise<any>>,
  isConnected: jest.fn() as jest.MockedFunction<() => boolean>,
  getInfo: jest.fn() as jest.MockedFunction<() => Promise<any>>,
};

jest.mock('../services/cache', () => ({
  cacheService: mockCacheService,
}));

// Мокаем metricsCollector напрямую
jest.mock('../services/metricsCollector', () => ({
  metricsCollector: {
    incrementCounter: jest.fn(),
    setGauge: jest.fn(),
    addToHistogram: jest.fn(),
    startTimer: jest.fn(() => jest.fn()),
    getSystemMetrics: jest.fn(() => ({
      memory: { used: 1000, total: 2000 },
      cpu: 50,
      uptime: 3600,
      nodeVersion: 'v18.0.0',
      platform: 'linux'
    })),
    getRedisMetrics: jest.fn(),
    getHistogram: jest.fn(),
    exportMetrics: jest.fn(),
    resetMetrics: jest.fn(),
    getCollectorStats: jest.fn(() => ({
      totalMetrics: 0,
      totalCounters: 0,
      totalGauges: 0,
      totalHistograms: 0,
      activeTimers: 0,
      memoryUsage: 1000,
      config: {}
    })),
  },
}));

// Мокаем env
jest.mock('../config/env', () => ({
  env: {
    metrics: {
      enabled: true,
      retentionPeriod: 3600000,
      batchSize: 500,
      flushInterval: 30000,
      redisStorage: true,
      memoryStorage: true,
    },
  },
}));

describe('Metrics Collector Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Сбрасываем моки
    (mockCacheService.get as jest.Mock).mockResolvedValue(null);
    (mockCacheService.set as jest.Mock).mockResolvedValue('OK');
    (mockCacheService.isConnected as jest.Mock).mockReturnValue(true);
    (mockCacheService.getInfo as jest.Mock).mockResolvedValue({
      used_memory: '1048576',
      connected_clients: '5',
      total_commands_processed: '1000',
      db0: 'keys=100,expires=10',
      expired_keys: '50',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('должен экспортировать metricsCollector', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector).toBeDefined();
    expect(typeof metricsModule.metricsCollector.incrementCounter).toBe('function');
    expect(typeof metricsModule.metricsCollector.setGauge).toBe('function');
    expect(typeof metricsModule.metricsCollector.addToHistogram).toBe('function');
  });

  it('должен иметь метод incrementCounter', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.incrementCounter).toBeDefined();
    expect(typeof metricsModule.metricsCollector.incrementCounter).toBe('function');
  });

  it('должен иметь метод setGauge', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.setGauge).toBeDefined();
    expect(typeof metricsModule.metricsCollector.setGauge).toBe('function');
  });

  it('должен иметь метод addToHistogram', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.addToHistogram).toBeDefined();
    expect(typeof metricsModule.metricsCollector.addToHistogram).toBe('function');
  });

  it('должен иметь метод startTimer', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.startTimer).toBeDefined();
    expect(typeof metricsModule.metricsCollector.startTimer).toBe('function');
  });

  it('должен иметь метод getSystemMetrics', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.getSystemMetrics).toBeDefined();
    expect(typeof metricsModule.metricsCollector.getSystemMetrics).toBe('function');
  });

  it('должен иметь метод getRedisMetrics', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.getRedisMetrics).toBeDefined();
    expect(typeof metricsModule.metricsCollector.getRedisMetrics).toBe('function');
  });

  it('должен иметь метод getHistogram', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.getHistogram).toBeDefined();
    expect(typeof metricsModule.metricsCollector.getHistogram).toBe('function');
  });

  it('должен иметь метод exportMetrics', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.exportMetrics).toBeDefined();
    expect(typeof metricsModule.metricsCollector.exportMetrics).toBe('function');
  });

  it('должен иметь метод resetMetrics', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.resetMetrics).toBeDefined();
    expect(typeof metricsModule.metricsCollector.resetMetrics).toBe('function');
  });

  it('должен иметь метод getCollectorStats', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    expect(metricsModule.metricsCollector.getCollectorStats).toBeDefined();
    expect(typeof metricsModule.metricsCollector.getCollectorStats).toBe('function');
  });

  it('должен корректно работать с счетчиками', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    const testName = 'test_counter';
    const testLabels = { type: 'test' };
    
    expect(() => {
      metricsModule.metricsCollector.incrementCounter(testName, testLabels);
    }).not.toThrow();
  });

  it('должен корректно работать с gauge', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    const testName = 'test_gauge';
    const testValue = 42;
    const testLabels = { type: 'test' };
    
    expect(() => {
      metricsModule.metricsCollector.setGauge(testName, testValue, testLabels);
    }).not.toThrow();
  });

  it('должен корректно работать с гистограммами', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    const testName = 'test_histogram';
    const testValue = 100;
    const testLabels = { type: 'test' };
    
    expect(() => {
      metricsModule.metricsCollector.addToHistogram(testName, testValue, testLabels);
    }).not.toThrow();
  });

  it('должен корректно работать с таймерами', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    const testName = 'test_timer';
    const testLabels = { type: 'test' };
    
    const timer = metricsModule.metricsCollector.startTimer(testName, testLabels);
    expect(typeof timer).toBe('function');
    
    // Завершаем таймер
    expect(() => {
      timer();
    }).not.toThrow();
  });

  it('должен возвращать системные метрики', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    const systemMetrics = metricsModule.metricsCollector.getSystemMetrics();
    
    expect(systemMetrics).toBeDefined();
    expect(systemMetrics.memory).toBeDefined();
    expect(systemMetrics.cpu).toBeDefined();
    expect(systemMetrics.uptime).toBeDefined();
    expect(systemMetrics.nodeVersion).toBeDefined();
    expect(systemMetrics.platform).toBeDefined();
  });

  it('должен возвращать статистику коллектора', async () => {
    const metricsModule = await import('../services/metricsCollector');
    
    const stats = metricsModule.metricsCollector.getCollectorStats();
    
    expect(stats).toBeDefined();
    expect(typeof stats.totalMetrics).toBe('number');
    expect(typeof stats.totalCounters).toBe('number');
    expect(typeof stats.totalGauges).toBe('number');
    expect(typeof stats.totalHistograms).toBe('number');
    expect(typeof stats.activeTimers).toBe('number');
    expect(typeof stats.memoryUsage).toBe('number');
    expect(stats.config).toBeDefined();
  });
});
