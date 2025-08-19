import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import healthPlugin from './health.js';

describe('health plugin', () => {
  let app: any;

  beforeEach(() => {
    app = {
      get: vi.fn((path: string, handler: (...args: unknown[]) => unknown) => {
        app._handler = handler;
      }),
      pg: undefined,
    } as unknown as FastifyInstance & { _handler?: (...args: unknown[]) => unknown };
  });

  it('registers /health route', async () => {
    await healthPlugin(app as unknown as FastifyInstance, {} as Record<never, never>);
    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function));
  });

  it('returns ok with skipped db when no pg', async () => {
    await healthPlugin(app as unknown as FastifyInstance, {} as Record<never, never>);
    const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };
    const res = await app._handler({ log: { error: vi.fn() } }, reply);
    expect(res).toEqual({ status: 'ok', checks: { database: 'skipped' } });
  });

  it('returns ok with db when pg available', async () => {
    app.pg = { query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }) };
    await healthPlugin(app as unknown as FastifyInstance, {} as Record<never, never>);
    const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };
    const res = await app._handler({ log: { error: vi.fn() } }, reply);
    expect(res).toEqual({ status: 'ok', checks: { database: 'ok' } });
  });

  it('returns 503 on db error', async () => {
    app.pg = { query: vi.fn().mockRejectedValue(new Error('db error')) };
    await healthPlugin(app as unknown as FastifyInstance, {} as Record<never, never>);
    const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };
    await app._handler({ log: { error: vi.fn() } }, reply);
    expect(reply.code).toHaveBeenCalledWith(503);
    expect(reply.send).toHaveBeenCalledWith({ status: 'error', checks: { database: 'error' } });
  });
});
