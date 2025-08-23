import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Мокаем console методы
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Мокаем winston
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    simple: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

describe('Logger Utility', () => {
  beforeEach(() => {
    // Очищаем моки
    jest.clearAllMocks();
    
    // Мокаем console
    global.console = mockConsole as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('должен экспортировать функции логирования', async () => {
    // Динамически импортируем logger для избежания проблем с моками
    const loggerModule = await import('../utils/logger');
    
    expect(typeof loggerModule.logInfo).toBe('function');
    expect(typeof loggerModule.logWarning).toBe('function');
    expect(typeof loggerModule.logError).toBe('function');
    expect(typeof loggerModule.requestLogger).toBe('function');
    expect(typeof loggerModule.errorLogger).toBe('function');
  });

  it('должен создавать middleware для логирования запросов', async () => {
    const loggerModule = await import('../utils/logger');
    
    expect(loggerModule.requestLogger).toBeDefined();
    expect(typeof loggerModule.requestLogger).toBe('function');
  });

  it('должен создавать middleware для логирования ошибок', async () => {
    const loggerModule = await import('../utils/logger');
    
    expect(loggerModule.errorLogger).toBeDefined();
    expect(typeof loggerModule.errorLogger).toBe('function');
  });

  it('должен обрабатывать различные уровни логирования', async () => {
    const loggerModule = await import('../utils/logger');
    
    // Проверяем, что функции не выбрасывают ошибки
    expect(() => {
      loggerModule.logInfo('Test info message');
    }).not.toThrow();
    
    expect(() => {
      loggerModule.logWarning('Test warning message');
    }).not.toThrow();
    
    expect(() => {
      loggerModule.logError('Test error message');
    }).not.toThrow();
  });

  it('должен создавать форматированные сообщения', async () => {
    const loggerModule = await import('../utils/logger');
    
    const testData = { key: 'value', number: 42 };
    
    expect(() => {
      loggerModule.logInfo('Test message with data', testData);
    }).not.toThrow();
    
    expect(() => {
      loggerModule.logWarning('Test warning with context', { context: 'test' });
    }).not.toThrow();
    
    expect(() => {
      loggerModule.logError('Test error with details', { error: 'test error' });
    }).not.toThrow();
  });
});
