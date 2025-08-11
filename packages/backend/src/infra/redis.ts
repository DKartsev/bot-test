export type RedisLike = {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<"OK">;
};

class InMemoryRedis implements RedisLike {
  private store = new Map<string, { value: string; exp: number }>();

  async get(key: string): Promise<string | null> {
    const rec = this.store.get(key);
    if (!rec) return null;
    if (Date.now() > rec.exp) {
      this.store.delete(key);
      return null;
    }
    return rec.value;
  }

  async setex(key: string, ttl: number, value: string): Promise<"OK"> {
    const exp = Date.now() + ttl * 1000;
    this.store.set(key, { value, exp });
    return "OK";
  }
}

export function createRedisClient(url?: string): RedisLike {
  if (!url) return new InMemoryRedis();
  // если используешь ioredis/redis — адаптируй к интерфейсу RedisLike и верни клиент
  // пример с ioredis:
  // const r = new (require('ioredis'))(url);
  // return { get: (k) => r.get(k), setex: (k, ttl, v) => r.setex(k, ttl, v) as Promise<'OK'> };
  return new InMemoryRedis(); // временно, пока не подключён реальный Redis
}
