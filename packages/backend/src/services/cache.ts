import { createClient, RedisClientType } from 'redis';
import { env } from '../config/env';
import { logInfo, logError, logWarning } from '../utils/logger';

/**
 * Сервис для работы с Redis кэшем
 */
export class CacheService {
  private client: RedisClientType | null = null;
  private connected = false;

  /**
   * Инициализация подключения к Redis
   */
  async connect(): Promise<void> {
    try {
      // Создаем клиент Redis
      const redisConfig = env.REDIS_URL 
        ? { url: env.REDIS_URL }
        : {
            socket: {
              host: env.REDIS_HOST,
              port: parseInt(env.REDIS_PORT, 10),
            },
            password: env.REDIS_PASSWORD,
            database: parseInt(env.REDIS_DB, 10),
          };

      this.client = createClient(redisConfig);

      // Обработчики событий
      this.client.on('error', (err) => {
        logError('Redis клиент ошибка:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logInfo('Подключение к Redis...');
      });

      this.client.on('ready', () => {
        logInfo('Redis подключен и готов к работе');
        this.connected = true;
      });

      this.client.on('end', () => {
        logWarning('Redis подключение закрыто');
        this.connected = false;
      });

      // Подключаемся
      await this.client.connect();
    } catch (error) {
      logError('Ошибка подключения к Redis:', error);
      throw error;
    }
  }

  /**
   * Отключение от Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      logInfo('Redis отключен');
    }
  }

  /**
   * Проверка подключения
   */
  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Получение значения по ключу
   */
  async get<T = string>(key: string): Promise<T | null> {
    if (!this.isConnected()) {
      logWarning('Redis не подключен, пропускаем get');
      return null;
    }

    try {
      const value = await this.client!.get(key);
      if (value === null) return null;

      // Пытаемся парсить JSON, если не получается - возвращаем как строку
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      logError(`Ошибка получения значения из кэша для ключа ${key}:`, error);
      return null;
    }
  }

  /**
   * Сохранение значения по ключу
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected()) {
      logWarning('Redis не подключен, пропускаем set');
      return false;
    }

    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client!.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.client!.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      logError(`Ошибка сохранения значения в кэш для ключа ${key}:`, error);
      return false;
    }
  }

  /**
   * Удаление значения по ключу
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      logWarning('Redis не подключен, пропускаем delete');
      return false;
    }

    try {
      const result = await this.client!.del(key);
      return result > 0;
    } catch (error) {
      logError(`Ошибка удаления значения из кэша для ключа ${key}:`, error);
      return false;
    }
  }

  /**
   * Проверка существования ключа
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.client!.exists(key);
      return result > 0;
    } catch (error) {
      logError(`Ошибка проверки существования ключа ${key}:`, error);
      return false;
    }
  }

  /**
   * Установка TTL для ключа
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.client!.expire(key, ttlSeconds);
      return result;
    } catch (error) {
      logError(`Ошибка установки TTL для ключа ${key}:`, error);
      return false;
    }
  }

  /**
   * Очистка всего кэша (осторожно!)
   */
  async flush(): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      await this.client!.flushDb();
      logInfo('Кэш очищен');
      return true;
    } catch (error) {
      logError('Ошибка очистки кэша:', error);
      return false;
    }
  }

  /**
   * Получение информации о Redis
   */
  async getInfo(): Promise<Record<string, string> | null> {
    if (!this.isConnected()) {
      return null;
    }

    try {
      const info = await this.client!.info();
      const lines = info.split('\r\n');
      const result: Record<string, string> = {};
      
      for (const line of lines) {
        if (line.includes(':') && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            result[key] = value;
          }
        }
      }
      
      return result;
    } catch (error) {
      logError('Ошибка получения информации о Redis:', error);
      return null;
    }
  }

  /**
   * Создание ключа для кэширования
   */
  createKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
}

// Создаем единственный экземпляр сервиса
export const cacheService = new CacheService();
