import { logger } from './logger';

interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private readonly defaultTtl: number;

  constructor(defaultTtlMs: number = 300000) { // 5 minutes default
    this.defaultTtl = defaultTtlMs;
    
    // Cleanup expired items every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTtl);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug({ cleaned, remaining: this.cache.size }, 'Cache cleanup completed');
    }
  }
}

// Global cache instances
export const conversationCache = new MemoryCache<any>(600000); // 10 minutes
export const messageCache = new MemoryCache<any>(300000); // 5 minutes
export const userCache = new MemoryCache<any>(1800000); // 30 minutes