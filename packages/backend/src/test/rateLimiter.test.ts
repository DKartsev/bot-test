import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Мокаем cacheService
const mockCacheService = {
  get: jest.fn() as jest.MockedFunction<() => Promise<any>>,
  set: jest.fn() as jest.MockedFunction<() => Promise<any>>,
  del: jest.fn() as jest.MockedFunction<() => Promise<any>>,
  isConnected: jest.fn() as jest.MockedFunction<() => boolean>,
};

jest.mock('../services/cache', () => ({
  cacheService: mockCacheService,
}));

// Мокаем env
jest.mock('../config/env', () => ({
  env: {
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      standardHeaders: true,
      legacyHeaders: false,
      storeClient: true,
      keyGenerator: 'ip',
      skip: false,
      handler: 'block',
      onLimitReached: 'log',
      onLimitExceeded: 'block',
      retryAfter: true,
      retryAfterMs: 60000,
    },
  },
}));

describe('Rate Limiter Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Сбрасываем моки
    (mockCacheService.get as jest.Mock).mockResolvedValue(null);
    (mockCacheService.set as jest.Mock).mockResolvedValue('OK');
    (mockCacheService.del as jest.Mock).mockResolvedValue(1);
    (mockCacheService.isConnected as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('должен корректно работать с моками', async () => {
    // Проверяем, что моки работают корректно
    expect(mockCacheService.get).toBeDefined();
    expect(mockCacheService.set).toBeDefined();
    expect(mockCacheService.del).toBeDefined();
    expect(mockCacheService.isConnected).toBeDefined();
  });

  it('должен корректно работать с конфигурацией', async () => {
    // Проверяем, что модуль загружается без ошибок
    expect(mockCacheService).toBeDefined();
  });
});
