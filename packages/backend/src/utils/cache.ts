import { logger } from "./logger.js";

interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private readonly defaultTtl: number;
  private intervalId: NodeJS.Timeout;

  constructor(defaultTtlMs: number = 300000) {
    // 5 minutes default
    this.defaultTtl = defaultTtlMs;

    // Cleanup expired items every minute
    this.intervalId = setInterval(() => this.cleanup(), 60000);
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

  stopCleanup(): void {
    clearInterval(this.intervalId);
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
      logger.debug(
        { cleaned, remaining: this.cache.size },
        "Cache cleanup completed",
      );
    }
  }
}

import { Conversation, Message, User } from "@app/shared";

// Global cache instances should be avoided in a serious application,
// but we keep them for now to match the original structure.
// In a real app, these would be injected as dependencies.
export const conversationCache = new MemoryCache<Conversation>(600000); // 10 minutes
export const messageCache = new MemoryCache<Message>(300000); // 5 minutes
export const userCache = new MemoryCache<User>(1800000); // 30 minutes
