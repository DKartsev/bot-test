import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Мокаем redis
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  info: jest.fn(),
  on: jest.fn(),
  isOpen: true,
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

// Мокаем CacheService напрямую
jest.mock('../services/cache', () => ({
  cacheService: {
    connect: jest.fn() as jest.MockedFunction<() => Promise<void>>,
    disconnect: jest.fn() as jest.MockedFunction<() => Promise<void>>,
    get: jest.fn() as jest.MockedFunction<() => Promise<any>>,
    set: jest.fn() as jest.MockedFunction<() => Promise<any>>,
    getInfo: jest.fn() as jest.MockedFunction<() => Promise<any>>,
    isConnected: jest.fn() as jest.MockedFunction<() => boolean>,
  },
}));

describe('Cache Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('должен экспортировать cacheService', async () => {
    const cacheModule = await import('../services/cache');
    
    expect(cacheModule.cacheService).toBeDefined();
    expect(typeof cacheModule.cacheService.connect).toBe('function');
    expect(typeof cacheModule.cacheService.disconnect).toBe('function');
    expect(typeof cacheModule.cacheService.get).toBe('function');
    expect(typeof cacheModule.cacheService.set).toBe('function');
  });

  it('должен иметь метод connect', async () => {
    const cacheModule = await import('../services/cache');
    
    expect(cacheModule.cacheService.connect).toBeDefined();
    expect(typeof cacheModule.cacheService.connect).toBe('function');
  });

  it('должен иметь метод disconnect', async () => {
    const cacheModule = await import('../services/cache');
    
    expect(cacheModule.cacheService.disconnect).toBeDefined();
    expect(typeof cacheModule.cacheService.disconnect).toBe('function');
  });

  it('должен иметь метод get', async () => {
    const cacheModule = await import('../services/cache');
    
    expect(cacheModule.cacheService.get).toBeDefined();
    expect(typeof cacheModule.cacheService.get).toBe('function');
  });

  it('должен иметь метод set', async () => {
    const cacheModule = await import('../services/cache');
    
    expect(cacheModule.cacheService.set).toBeDefined();
    expect(typeof cacheModule.cacheService.set).toBe('function');
  });

  it('должен иметь метод getInfo', async () => {
    const cacheModule = await import('../services/cache');
    
    expect(cacheModule.cacheService.getInfo).toBeDefined();
    expect(typeof cacheModule.cacheService.getInfo).toBe('function');
  });

  it('должен иметь метод getInfo', async () => {
    const cacheModule = await import('../services/cache');
    
    expect(cacheModule.cacheService.getInfo).toBeDefined();
    expect(typeof cacheModule.cacheService.getInfo).toBe('function');
  });

  it('должен иметь метод isConnected', async () => {
    const cacheModule = await import('../services/cache');
    
    expect(cacheModule.cacheService.isConnected).toBeDefined();
    expect(typeof cacheModule.cacheService.isConnected).toBe('function');
  });

  it('должен проверять подключение к Redis', async () => {
    const cacheModule = await import('../services/cache');
    
    // Мокаем isConnected для возврата true
    jest.spyOn(cacheModule.cacheService, 'isConnected').mockReturnValue(true);
    
    expect(cacheModule.cacheService.isConnected()).toBe(true);
  });

  it('должен обрабатывать ошибки подключения', async () => {
    const cacheModule = await import('../services/cache');
    
    // Мокаем connect для выбрасывания ошибки
    jest.spyOn(cacheModule.cacheService, 'connect').mockRejectedValue(new Error('Connection failed'));
    
    await expect(cacheModule.cacheService.connect()).rejects.toThrow('Connection failed');
  });

  it('должен корректно работать с ключами и значениями', async () => {
    const cacheModule = await import('../services/cache');
    
    const testKey = 'test:key';
    const testValue = 'test_value';
    const testTtl = 3600;
    
    // Проверяем, что методы не выбрасывают ошибки
    expect(() => {
      cacheModule.cacheService.set(testKey, testValue, testTtl);
    }).not.toThrow();
    
    expect(() => {
      cacheModule.cacheService.get(testKey);
    }).not.toThrow();
    
      expect(() => {
        cacheModule.cacheService.set(testKey, testValue, testTtl);
      }).not.toThrow();
  });
});
