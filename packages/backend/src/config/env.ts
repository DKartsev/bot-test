import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Схема валидации переменных окружения
const envSchema = z.object({
  // Сервер
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  // База данных
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('5432'),
  DB_NAME: z.string().default('support_db'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: z.string().default('false'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET должен быть не менее 32 символов').default('dev-jwt-secret-key-32-chars-minimum-required'),
  JWT_REFRESH_SECRET: z.string().min(32).default('dev-jwt-refresh-secret-key-32-chars-minimum-required'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  PUBLIC_URL: z.string().url().optional(),

  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_KEY: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBED_MODEL: z.string().default('text-embedding-3-small'),

  // Redis (для кэширования)
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),

  // Логирование
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),

  // Безопасность
  SESSION_SECRET: z.string().min(32).optional(),
  COOKIE_SECRET: z.string().min(32).optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 минут
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Файлы
  MAX_FILE_SIZE: z.string().default('10485760'), // 10MB
  UPLOAD_DIR: z.string().default('uploads'),

  // Мониторинг
  ENABLE_METRICS: z.string().default('false'),
  METRICS_PORT: z.string().default('9090'),

  // Метрики и мониторинг
  METRICS_ENABLED: z.string().default('true'),
  METRICS_RETENTION_PERIOD: z.string().default('86400000'), // 24 часа
  METRICS_BATCH_SIZE: z.string().default('1000'),
  METRICS_FLUSH_INTERVAL: z.string().default('60000'), // 1 минута
  METRICS_REDIS_STORAGE: z.string().default('true'),
  METRICS_MEMORY_STORAGE: z.string().default('true'),

  // Обработка ошибок
  MAX_ERROR_DETAILS_LENGTH: z.string().default('1000'),
  ERROR_SAMPLING_RATE: z.string().default('1.0'),

  // Оптимизация SQL запросов
  SLOW_QUERY_THRESHOLD: z.string().default('1000'),
  ENABLE_QUERY_LOGGING: z.string().default('true'),
  ENABLE_EXPLAIN_ANALYSIS: z.string().default('true'),
  MAX_QUERY_LENGTH: z.string().default('1000'),
  ENABLE_INDEX_RECOMMENDATIONS: z.string().default('true'),

  // Тестирование
  TEST_DATABASE_URL: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MAX_TOKENS: z.string().default('4000'),
  OPENAI_TEMPERATURE: z.string().default('0.3'),
  OPENAI_TIMEOUT: z.string().default('30000'),

  // Дополнительные настройки
  ENABLE_SWAGGER: z.string().default('false'),
  API_VERSION: z.string().default('v1'),
  DEBUG_MODE: z.string().default('false'),
});

// Валидируем переменные окружения
let config: z.infer<typeof envSchema>;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Ошибка валидации переменных окружения:');
    const zodError = error as z.ZodError<any>;
    zodError.issues.forEach((err: z.ZodIssue) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// Создаем объект конфигурации с дополнительными вычисляемыми значениями
export const env = {
  ...config,

  // Вычисляемые значения
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',

  // База данных
  database: {
    url: config.DATABASE_URL || `postgresql://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`,
    host: config.DB_HOST,
    port: parseInt(config.DB_PORT),
    name: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    ssl: config.DB_SSL === 'true',
  },

  // Redis
  redis: {
    url: config.REDIS_URL || `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`,
    host: config.REDIS_HOST,
    port: parseInt(config.REDIS_PORT),
    password: config.REDIS_PASSWORD,
    db: parseInt(config.REDIS_DB),
  },

  // JWT
  jwt: {
    secret: config.JWT_SECRET,
    refreshSecret: config.JWT_REFRESH_SECRET || config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN,
    refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
  },

  // Безопасность
  security: {
    sessionSecret: config.SESSION_SECRET || config.JWT_SECRET,
    cookieSecret: config.COOKIE_SECRET || config.JWT_SECRET,
    rateLimit: {
      windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS),
      maxRequests: parseInt(config.RATE_LIMIT_MAX_REQUESTS),
    },
  },

  // Файлы
  files: {
    maxSize: parseInt(config.MAX_FILE_SIZE),
    uploadDir: config.UPLOAD_DIR,
    maxFileNameLength: 255, // Фиксированное значение
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },

  // API
  api: {
    version: config.API_VERSION,
    basePath: `/api/${config.API_VERSION}`,
    cors: {
      origin: config.CORS_ORIGIN,
      credentials: true,
    },
  },

  // Метрики
  metrics: {
    enabled: config.METRICS_ENABLED === 'true',
    retentionPeriod: parseInt(config.METRICS_RETENTION_PERIOD),
    batchSize: parseInt(config.METRICS_BATCH_SIZE),
    flushInterval: parseInt(config.METRICS_FLUSH_INTERVAL),
    redisStorage: config.METRICS_REDIS_STORAGE === 'true',
    memoryStorage: config.METRICS_MEMORY_STORAGE === 'true',
  },

  // Обработка ошибок
  errorHandling: {
    maxErrorDetailsLength: parseInt(config.MAX_ERROR_DETAILS_LENGTH),
    errorSamplingRate: parseFloat(config.ERROR_SAMPLING_RATE),
  },

  // Оптимизация SQL
  queryOptimization: {
    slowQueryThreshold: parseInt(config.SLOW_QUERY_THRESHOLD),
    enableQueryLogging: config.ENABLE_QUERY_LOGGING === 'true',
    enableExplainAnalysis: config.ENABLE_EXPLAIN_ANALYSIS === 'true',
    maxQueryLength: parseInt(config.MAX_QUERY_LENGTH),
    enableIndexRecommendations: config.ENABLE_INDEX_RECOMMENDATIONS === 'true',
  },

  // OpenAI
  openai: {
    apiKey: config.OPENAI_API_KEY,
    model: config.OPENAI_MODEL,
    baseURL: config.OPENAI_BASE_URL,
    maxTokens: parseInt(config.OPENAI_MAX_TOKENS),
    temperature: parseFloat(config.OPENAI_TEMPERATURE),
    timeout: parseInt(config.OPENAI_TIMEOUT),
  },
};

// Экспортируем конфигурацию
export default env;
