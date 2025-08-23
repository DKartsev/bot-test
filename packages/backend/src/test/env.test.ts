import { describe, it, expect, beforeEach } from '@jest/globals';

// Мокаем process.env перед импортом
const mockEnv = {
  NODE_ENV: 'test',
  PORT: '3001',
  JWT_SECRET: 'test-secret-key-32-chars-long-enough',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'test_db',
  DB_USER: 'test_user',
  DB_PASSWORD: 'test_password',
  METRICS_ENABLED: 'true',
  METRICS_RETENTION_PERIOD: '3600000',
  METRICS_BATCH_SIZE: '500',
  METRICS_FLUSH_INTERVAL: '30000',
  METRICS_REDIS_STORAGE: 'true',
  METRICS_MEMORY_STORAGE: 'true',
  MAX_ERROR_DETAILS_LENGTH: '500',
  ERROR_SAMPLING_RATE: '0.5',
  SLOW_QUERY_THRESHOLD: '500',
  ENABLE_QUERY_LOGGING: 'true',
  ENABLE_EXPLAIN_ANALYSIS: 'true',
  MAX_QUERY_LENGTH: '500',
  ENABLE_INDEX_RECOMMENDATIONS: 'true',
};

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Устанавливаем mock переменные окружения
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  it('должен загружать базовые переменные окружения', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.PORT).toBe('3001');
    expect(process.env.JWT_SECRET).toBe('test-secret-key-32-chars-long-enough');
  });

  it('должен загружать переменные для метрик', () => {
    expect(process.env.METRICS_ENABLED).toBe('true');
    expect(process.env.METRICS_RETENTION_PERIOD).toBe('3600000');
    expect(process.env.METRICS_BATCH_SIZE).toBe('500');
  });

  it('должен загружать переменные для обработки ошибок', () => {
    expect(process.env.MAX_ERROR_DETAILS_LENGTH).toBe('500');
    expect(process.env.ERROR_SAMPLING_RATE).toBe('0.5');
  });

  it('должен загружать переменные для оптимизации SQL', () => {
    expect(process.env.SLOW_QUERY_THRESHOLD).toBe('500');
    expect(process.env.ENABLE_QUERY_LOGGING).toBe('true');
    expect(process.env.ENABLE_EXPLAIN_ANALYSIS).toBe('true');
  });

  it('должен загружать переменные для базы данных', () => {
    expect(process.env.DB_HOST).toBe('localhost');
    expect(process.env.DB_PORT).toBe('5432');
    expect(process.env.DB_NAME).toBe('test_db');
    expect(process.env.DB_USER).toBe('test_user');
  });

  it('должен загружать переменные для Redis', () => {
    expect(process.env.REDIS_HOST).toBe('localhost');
    expect(process.env.REDIS_PORT).toBe('6379');
  });
});
