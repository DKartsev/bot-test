import { Redis } from "ioredis";

class InMemoryRedis {
  private store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async setex(key: string, _seconds: number, value: string) {
    this.store.set(key, value);
  }
}

export const redis: Pick<Redis, "get" | "setex"> = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new InMemoryRedis();
