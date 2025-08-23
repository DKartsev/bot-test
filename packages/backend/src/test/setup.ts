import { jest, beforeAll, afterAll } from '@jest/globals';

// Глобальные настройки для тестов
beforeAll(() => {
  // Отключаем логирование в тестах
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Мокаем process.env для тестов
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CORS_ORIGIN = 'http://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-long-enough';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Глобальные моки для внешних зависимостей
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    info: jest.fn(),
    on: jest.fn(),
    isOpen: true,
  })),
}));

jest.mock('express', () => {
  const mockExpress = () => ({
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn(),
    set: jest.fn(),
    locals: {},
  });
  mockExpress.json = jest.fn();
  mockExpress.urlencoded = jest.fn();
  mockExpress.static = jest.fn();
  return mockExpress;
});

jest.mock('multer', () => {
  return jest.fn(() => ({
    single: jest.fn(),
    array: jest.fn(),
    fields: jest.fn(),
  }));
});
