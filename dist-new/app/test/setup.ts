import { vi } from 'vitest';

// Мокаем process.exit для предотвращения завершения тестов
vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit(${code}) was called`);
});

// Мокаем console для подавления логов в тестах
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Мокаем dotenv-safe до импорта других модулей
vi.mock('dotenv-safe', () => ({
  config: vi.fn()
}));

// Мокаем OpenAI для всех тестов
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn(),
    },
  })),
}));

// Мокаем hnswlib-node для тестов
vi.mock('hnswlib-node', () => ({
  HierarchicalNSW: vi.fn().mockImplementation(() => ({
    initIndex: vi.fn(),
    addPoint: vi.fn(),
    searchKnn: vi.fn(() => ({ neighbors: [0], distances: [0.1] })),
    getCurrentCount: vi.fn(() => 0),
    writeIndex: vi.fn(),
    readIndex: vi.fn(),
  })),
}));

// Мокаем pg для тестов
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  })),
}));

// Мокаем Redis для тестов
vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
  })),
}));

// Мокаем fastify для тестов
vi.mock('fastify', () => ({
  default: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    addHook: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    listen: vi.fn(),
    close: vi.fn(),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  })),
}));

// Мокаем telegraf для тестов
vi.mock('telegraf', () => ({
  Telegraf: vi.fn().mockImplementation(() => ({
    launch: vi.fn(),
    catch: vi.fn(),
    on: vi.fn(),
    telegram: {
      setWebhook: vi.fn(),
    },
  })),
}));

// Мокаем process.env для тестов
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.OPENAI_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TG_WEBHOOK_SECRET = 'test-secret';
process.env.ADMIN_IP_ALLOWLIST = '127.0.0.1';
process.env.ADMIN_RATE_LIMIT_MAX = '100';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PUBLIC_URL = 'http://localhost:3000';
process.env.TG_WEBHOOK_PATH = '/webhooks/telegram';
process.env.TELEGRAM_SET_WEBHOOK_ON_START = 'false';
process.env.ENABLE_DOCS = 'false';
process.env.PORT = '3000';

// Восстанавливаем process.exit после тестов
vi.afterAll(() => {
  vi.restoreAllMocks();
});
