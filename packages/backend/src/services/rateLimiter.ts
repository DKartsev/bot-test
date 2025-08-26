import type { Request, Response, NextFunction } from 'express';
import { cacheService } from './cache';
import { logError, logWarning, logInfo } from '../utils/logger';
import { env } from '../config/env';

/**
 * Конфигурация rate limiting
 */
export interface RateLimitConfig {
  windowMs: number;           // Временное окно в миллисекундах
  maxRequests: number;        // Максимальное количество запросов в окне
  message?: string;           // Сообщение об ошибке
  statusCode?: number;        // HTTP статус код
  headers?: boolean;          // Добавлять ли заголовки с лимитами
  skipSuccessfulRequests?: boolean; // Пропускать успешные запросы
  skipFailedRequests?: boolean;     // Пропускать неудачные запросы
  keyGenerator?: (req: Request) => string; // Генератор ключей
  handler?: (req: Request, res: Response, next: NextFunction) => void; // Обработчик превышения лимита
  onLimitReached?: (req: Request, res: Response, next: NextFunction) => void; // Callback при достижении лимита
}

/**
 * Информация о rate limiting
 */
export interface RateLimitInfo {
  limit: number;              // Лимит запросов
  remaining: number;          // Оставшиеся запросы
  reset: number;              // Время сброса (timestamp)
  retryAfter: number;         // Время ожидания в секундах
}

/**
 * Статистика rate limiting
 */
export interface RateLimitStats {
  totalRequests: number;      // Общее количество запросов
  blockedRequests: number;    // Заблокированные запросы
  uniqueClients: number;      // Уникальные клиенты
  topOffenders: Array<{       // Топ нарушителей
    key: string;
    requests: number;
    blocked: number;
  }>;
}

/**
 * Сервис для управления rate limiting
 */
export class RateLimiterService {
  private configs: Map<string, RateLimitConfig> = new Map();
  private stats: Map<string, RateLimitStats> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Инициализация конфигураций по умолчанию
   */
  private initializeDefaultConfigs(): void {
    // Глобальный лимит для всех API
    this.addConfig('global', {
      windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 минут
      maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
      message: 'Слишком много запросов с этого IP',
      statusCode: 429,
      headers: true,
    });

    // Строгий лимит для аутентификации
    this.addConfig('auth', {
      windowMs: parseInt(process.env.ADMIN_RATE_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.ADMIN_RATE_MAX || '30', 10),
      message: 'Слишком много попыток аутентификации',
      statusCode: 429,
      headers: true,
      skipSuccessfulRequests: true, // Сбрасываем счетчик при успешной аутентификации
    });

    // Лимит для загрузки файлов
    this.addConfig('fileUpload', {
      windowMs: 60 * 60 * 1000, // 1 час
      maxRequests: 20, // Максимум 20 загрузок в час
      message: 'Превышен лимит загрузки файлов',
      statusCode: 429,
      headers: true,
    });

    // Лимит для поиска
    this.addConfig('search', {
      windowMs: 5 * 60 * 1000, // 5 минут
      maxRequests: 30, // Максимум 30 поисковых запросов
      message: 'Превышен лимит поисковых запросов',
      statusCode: 429,
      headers: true,
    });

    // Лимит для WebSocket соединений
    this.addConfig('websocket', {
      windowMs: 60 * 1000, // 1 минута
      maxRequests: 10, // Максимум 10 подключений в минуту
      message: 'Превышен лимит WebSocket подключений',
      statusCode: 429,
      headers: true,
    });
  }

  /**
   * Добавление новой конфигурации
   */
  addConfig(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
    this.stats.set(name, {
      totalRequests: 0,
      blockedRequests: 0,
      uniqueClients: 0,
      topOffenders: [],
    });
    logInfo(`Rate limiting конфигурация добавлена: ${name}`, config);
  }

  /**
   * Получение конфигурации по имени
   */
  getConfig(name: string): RateLimitConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * Создание middleware для rate limiting
   */
  createMiddleware(configName: string): (req: Request, res: Response, next: NextFunction) => void {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limiting конфигурация '${configName}' не найдена`);
    }

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.generateKey(req, config);
        const result = await this.checkLimit(key, configName, config);
        
        if (result.allowed) {
          // Запрос разрешен
          this.updateStats(configName, key, false);
          this.setHeaders(res, result.info);
          next();
        } else {
          // Запрос заблокирован
          this.updateStats(configName, key, true);
          
          if (config.onLimitReached) {
            config.onLimitReached(req, res, next);
          } else if (config.handler) {
            config.handler(req, res, next);
          } else {
            this.defaultHandler(req, res, result.info, config);
          }
        }
      } catch (error) {
        logError('Ошибка rate limiting', {
          configName,
          error: error instanceof Error ? error.message : 'Unknown error',
          url: req.url,
          method: req.method,
        });
        // В случае ошибки пропускаем запрос
        next();
      }
    };
  }

  /**
   * Проверка лимита для ключа
   */
  private async checkLimit(key: string, configName: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    info: RateLimitInfo;
  }> {
    const now = Date.now();
    const _windowStart = now - config.windowMs;
    
    try {
      if (cacheService.isConnected()) {
        // Используем Redis для rate limiting
        return await this.checkLimitRedis(key, configName, config, now, _windowStart);
      } else {
        // Fallback на in-memory storage
        return this.checkLimitMemory(key, configName, config, now, _windowStart);
      }
    } catch (error) {
      logError('Ошибка проверки rate limit', {
        configName,
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // В случае ошибки разрешаем запрос
      return {
        allowed: true,
        info: {
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          reset: now + config.windowMs,
          retryAfter: Math.ceil(config.windowMs / 1000),
        },
      };
    }
  }

  /**
   * Проверка лимита через Redis
   */
  private async checkLimitRedis(
    key: string,
    configName: string,
    config: RateLimitConfig,
    now: number,
    _windowStart: number
  ): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const redisKey = `rate_limit:${configName}:${key}`;
    const resetTime = now + config.windowMs;
    
    try {
      // Получаем текущий счетчик
      const currentCount = await cacheService.get(redisKey);
      const count = currentCount ? parseInt(currentCount, 10) : 0;
      
      if (count >= config.maxRequests) {
        // Лимит превышен
        return {
          allowed: false,
          info: {
            limit: config.maxRequests,
            remaining: 0,
            reset: resetTime,
            retryAfter: Math.ceil((resetTime - now) / 1000),
          },
        };
      }
      
      // Увеличиваем счетчик
      const newCount = count + 1;
      await cacheService.set(redisKey, newCount.toString(), Math.ceil(config.windowMs / 1000));
      
      return {
        allowed: true,
        info: {
          limit: config.maxRequests,
          remaining: config.maxRequests - newCount,
          reset: resetTime,
          retryAfter: 0,
        },
      };
    } catch (error) {
      throw new Error(`Redis rate limiting error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Проверка лимита в памяти (fallback)
   */
  private checkLimitMemory(
    key: string,
    configName: string,
    config: RateLimitConfig,
    now: number,
    _windowStart: number
  ): { allowed: boolean; info: RateLimitInfo } {
    // Простая in-memory реализация для fallback
    // В продакшене рекомендуется использовать Redis
    
    const resetTime = now + config.windowMs;
    return {
      allowed: true,
      info: {
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: resetTime,
        retryAfter: 0,
      },
    };
  }

  /**
   * Генерация ключа для rate limiting
   */
  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }
    
    // По умолчанию используем IP адрес
    const ip = req.ip ?? req.connection.remoteAddress ?? 'unknown';
    return `${ip}`;
  }

  /**
   * Установка заголовков с информацией о rate limiting
   */
  private setHeaders(res: Response, info: RateLimitInfo): void {
    res.set('X-RateLimit-Limit', info.limit.toString());
    res.set('X-RateLimit-Remaining', info.remaining.toString());
    res.set('X-RateLimit-Reset', new Date(info.reset).toISOString());
    
    if (info.retryAfter > 0) {
      res.set('Retry-After', info.retryAfter.toString());
    }
  }

  /**
   * Обработчик по умолчанию для превышения лимита
   */
  private defaultHandler(req: Request, res: Response, info: RateLimitInfo, config: RateLimitConfig): void {
    const statusCode = config.statusCode ?? 429;
    const message = config.message ?? 'Too Many Requests';
    
    logWarning('Rate limit превышен', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      limit: info.limit,
      remaining: info.remaining,
      reset: new Date(info.reset).toISOString(),
    });

    res.status(statusCode).json({
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      details: {
        limit: info.limit,
        remaining: info.remaining,
        reset: new Date(info.reset).toISOString(),
        retryAfter: info.retryAfter,
      },
    });
  }

  /**
   * Обновление статистики
   */
  private updateStats(configName: string, key: string, blocked: boolean): void {
    const stats = this.stats.get(configName);
    if (!stats) return;

    stats.totalRequests++;
    if (blocked) {
      stats.blockedRequests++;
    }

    // Обновляем топ нарушителей
    const offenderIndex = stats.topOffenders.findIndex(o => o.key === key);
    if (offenderIndex >= 0) {
      stats.topOffenders[offenderIndex]!.requests++;
      if (blocked) {
        stats.topOffenders[offenderIndex]!.blocked++;
      }
    } else {
      stats.topOffenders.push({
        key,
        requests: 1,
        blocked: blocked ? 1 : 0,
      });
    }

    // Сортируем по количеству запросов
    stats.topOffenders.sort((a, b) => b.requests - a.requests);
    
    // Оставляем только топ-10
    if (stats.topOffenders.length > 10) {
      stats.topOffenders = stats.topOffenders.slice(0, 10);
    }
  }

  /**
   * Получение статистики по конфигурации
   */
  getStats(configName: string): RateLimitStats | undefined {
    return this.stats.get(configName);
  }

  /**
   * Получение общей статистики
   */
  getAllStats(): Record<string, RateLimitStats> {
    const result: Record<string, RateLimitStats> = {};
    for (const [name, stats] of this.stats) {
      result[name] = { ...stats };
    }
    return result;
  }

  /**
   * Сброс статистики
   */
  resetStats(configName?: string): void {
    if (configName) {
      const stats = this.stats.get(configName);
      if (stats) {
        stats.totalRequests = 0;
        stats.blockedRequests = 0;
        stats.topOffenders = [];
      }
    } else {
      for (const stats of this.stats.values()) {
        stats.totalRequests = 0;
        stats.blockedRequests = 0;
        stats.topOffenders = [];
      }
    }
    logInfo('Статистика rate limiting сброшена', { configName: configName ?? 'all' });
  }

  /**
   * Получение информации о текущих лимитах
   */
  getCurrentLimits(): Record<string, RateLimitConfig> {
    const result: Record<string, RateLimitConfig> = {};
    for (const [name, config] of this.configs) {
      result[name] = { ...config };
    }
    return result;
  }

  /**
   * Динамическое обновление конфигурации
   */
  updateConfig(name: string, updates: Partial<RateLimitConfig>): boolean {
    const config = this.configs.get(name);
    if (!config) {
      return false;
    }

    const updatedConfig = { ...config, ...updates };
    this.configs.set(name, updatedConfig);
    
    logInfo(`Rate limiting конфигурация обновлена: ${name}`, updates);
    return true;
  }

  /**
   * Удаление конфигурации
   */
  removeConfig(name: string): boolean {
    const removed = this.configs.delete(name);
    this.stats.delete(name);
    
    if (removed) {
      logInfo(`Rate limiting конфигурация удалена: ${name}`);
    }
    
    return removed;
  }
}

// Экспортируем единственный экземпляр
export const rateLimiterService = new RateLimiterService();

/**
 * Готовые middleware для различных типов rate limiting
 */
export const rateLimitMiddleware = {
  // Глобальный лимит
  global: () => rateLimiterService.createMiddleware('global'),
  
  // Лимит для аутентификации
  auth: () => rateLimiterService.createMiddleware('auth'),
  
  // Лимит для загрузки файлов
  fileUpload: () => rateLimiterService.createMiddleware('fileUpload'),
  
  // Лимит для поиска
  search: () => rateLimiterService.createMiddleware('search'),
  
  // Лимит для WebSocket
  websocket: () => rateLimiterService.createMiddleware('websocket'),
  
  // Кастомный лимит
  custom: (config: RateLimitConfig) => {
    const name = `custom_${Date.now()}`;
    rateLimiterService.addConfig(name, config);
    return rateLimiterService.createMiddleware(name);
  },
  
  // Middleware для мониторинга (более мягкий лимит)
  monitoring: () => {
    // Добавляем конфигурацию для мониторинга
    rateLimiterService.addConfig('monitoring', {
      windowMs: 60000, // 1 минута
      maxRequests: 30, // 30 запросов в минуту
      message: 'Превышен лимит мониторинга',
      statusCode: 429,
      headers: true,
    });
    return rateLimiterService.createMiddleware('monitoring');
  },
  
  // Middleware для админских операций (строгий лимит)
  admin: () => {
    // Добавляем конфигурацию для админа
    rateLimiterService.addConfig('admin', {
      windowMs: 300000, // 5 минут
      maxRequests: 10, // 10 запросов в 5 минут
      message: 'Превышен лимит админских операций',
      statusCode: 429,
      headers: true,
    });
    return rateLimiterService.createMiddleware('admin');
  },
};
