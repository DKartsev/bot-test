export type RedisLike = {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<"OK">;
};

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; exp: number }>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async get(key: string): Promise<string | null> {
    const rec = this.store.get(key);
    if (!rec) return null;
    if (Date.now() > rec.exp) {
      this.store.delete(key);
      return null;
    }
    return rec.value;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async setex(key: string, ttl: number, value: string): Promise<"OK"> {
    const exp = Date.now() + ttl * 1000;
    this.store.set(key, { value, exp });
    return "OK";
  }
}

export function createRedisClient(url?: string): RedisLike {
  if (!url) return new InMemoryRedis();
  // Верни адаптер, совместимый с RedisLike, если подключишь реальный Redis
  return new InMemoryRedis();
}
