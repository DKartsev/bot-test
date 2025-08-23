import type { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';
import { logInfo, logWarning } from '../utils/logger';

/**
 * Опции для middleware кэширования
 */
interface CacheOptions {
  /** TTL в секундах */
  ttl?: number;
  /** Префикс для ключей кэша */
  prefix?: string;
  /** Функция для создания кастомного ключа */
  keyGenerator?: (req: Request) => string;
  /** Условие для кэширования (если false - не кэшируем) */
  condition?: (req: Request, res: Response) => boolean;
  /** Варьировать кэш по заголовкам */
  varyBy?: string[];
}

/**
 * Создает middleware для кэширования GET запросов
 */
export function createCacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300, // 5 минут по умолчанию
    prefix = 'api',
    keyGenerator,
    condition,
    varyBy = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Кэшируем только GET запросы
    if (req.method !== 'GET') {
      return next();
    }

    // Проверяем условие кэширования
    if (condition && !condition(req, res)) {
      return next();
    }

    // Проверяем подключение к Redis
    if (!cacheService.isConnected()) {
      logWarning('Redis не подключен, пропускаем кэширование');
      return next();
    }

    try {
      // Генерируем ключ для кэша
      const cacheKey = generateCacheKey(req, prefix, keyGenerator, varyBy);
      
      // Пытаемся получить данные из кэша
      const cachedData = await cacheService.get<{
        data: unknown;
        headers: Record<string, string>;
        statusCode: number;
      }>(cacheKey);

      if (cachedData) {
        // Возвращаем данные из кэша
        logInfo(`Кэш попадание для ${cacheKey}`);
        
        // Устанавливаем заголовки
        Object.entries(cachedData.headers).forEach(([key, value]) => {
          res.set(key, value);
        });
        
        // Добавляем заголовок о том, что данные из кэша
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        res.status(cachedData.statusCode).json(cachedData.data);
        return;
      }

      // Данных в кэше нет, перехватываем ответ
      const originalJson = res.json.bind(res);
      const originalStatus = res.status.bind(res);
      let statusCode = 200;

      // Перехватываем status()
      res.status = function(code: number) {
        statusCode = code;
        return originalStatus(code);
      };

      // Перехватываем json()
      res.json = function(data: unknown) {
        // Кэшируем только успешные ответы
        if (statusCode >= 200 && statusCode < 300) {
          // Сохраняем в кэш асинхронно
          void saveToCacheAsync(cacheKey, {
            data,
            headers: extractCacheableHeaders(res),
            statusCode
          }, ttl);
        }

        // Добавляем заголовки о кэше
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);

        return originalJson(data);
      };

      next();
    } catch (error) {
      logWarning('Ошибка в middleware кэширования:', error);
      next();
    }
  };
}

/**
 * Генерирует ключ для кэша
 */
function generateCacheKey(
  req: Request,
  prefix: string,
  keyGenerator?: (req: Request) => string,
  varyBy: string[] = []
): string {
  if (keyGenerator) {
    return cacheService.createKey(prefix, keyGenerator(req));
  }

  // Базовый ключ из URL и query параметров
  const url = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  
  // Добавляем vary заголовки
  const varyParts = varyBy.map(header => {
    const value = req.get(header) || '';
    return `${header}:${value}`;
  }).join('|');

  const keyParts = [url, query];
  if (varyParts) {
    keyParts.push(varyParts);
  }

  return cacheService.createKey(prefix, ...keyParts);
}

/**
 * Извлекает заголовки, которые нужно кэшировать
 */
function extractCacheableHeaders(res: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Список заголовков для кэширования
  const cacheableHeaders = [
    'content-type',
    'content-encoding',
    'content-language',
    'etag',
    'last-modified'
  ];

  cacheableHeaders.forEach(header => {
    const value = res.get(header);
    if (value) {
      headers[header] = value;
    }
  });

  return headers;
}

/**
 * Асинхронно сохраняет данные в кэш
 */
async function saveToCacheAsync(
  key: string,
  data: { data: unknown; headers: Record<string, string>; statusCode: number },
  ttl: number
): Promise<void> {
  try {
    await cacheService.set(key, data, ttl);
    logInfo(`Данные сохранены в кэш: ${key}`);
  } catch (error) {
    logWarning(`Ошибка сохранения в кэш для ключа ${key}:`, error);
  }
}

/**
 * Middleware для инвалидации кэша
 */
export function createCacheInvalidationMiddleware(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Сохраняем оригинальные методы
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Функция инвалидации
    const invalidateCache = async (): Promise<void> => {
      if (!cacheService.isConnected()) {
        return;
      }

      try {
        for (const pattern of patterns) {
          // Простая инвалидация по паттерну (в реальном проекте можно использовать Redis SCAN)
          await cacheService.delete(pattern);
          logInfo(`Инвалидирован кэш по паттерну: ${pattern}`);
        }
      } catch (error) {
        logWarning('Ошибка инвалидации кэша:', error);
      }
    };

    // Перехватываем ответы для инвалидации кэша после успешных операций
    res.json = function(data: unknown) {
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 300) {
        void invalidateCache();
      }
      return originalJson(data);
    };

    res.send = function(data: unknown) {
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 300) {
        void invalidateCache();
      }
      return originalSend(data);
    };

    next();
  };
}

/**
 * Готовые middleware для разных типов кэширования
 */
export const cacheMiddleware = {
  // Короткий кэш (1 минута) для часто изменяющихся данных
  short: createCacheMiddleware({ ttl: 60, prefix: 'short' }),
  
  // Средний кэш (5 минут) для обычных API
  medium: createCacheMiddleware({ ttl: 300, prefix: 'medium' }),
  
  // Длинный кэш (30 минут) для редко изменяющихся данных
  long: createCacheMiddleware({ ttl: 1800, prefix: 'long' }),
  
  // Кэш для списков (варьируется по пагинации)
  paginated: createCacheMiddleware({
    ttl: 300,
    prefix: 'paginated',
    keyGenerator: (req) => {
      const { page = 1, limit = 10, ...filters } = req.query;
      return `page:${page}_limit:${limit}_filters:${JSON.stringify(filters)}`;
    }
  }),
  
  // Кэш для пользовательских данных (варьируется по user ID)
  userSpecific: createCacheMiddleware({
    ttl: 300,
    prefix: 'user',
    keyGenerator: (req) => {
      const userId = (req as Request & { user?: { id: number } }).user?.id || 'anonymous';
      return `${userId}_${req.originalUrl}`;
    }
  })
};
