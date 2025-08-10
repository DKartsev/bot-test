class InMemoryRedis {
  private store = new Map<string, string>();
  async get(key: string) { return this.store.get(key) ?? null; }
  async setex(key: string, _ttl: number, value: string) { this.store.set(key, value); return 'OK'; }
}
export const redis = new InMemoryRedis();
