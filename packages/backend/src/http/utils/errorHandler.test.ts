import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Мокаем логгер, чтобы избежать загрузки env в тестах
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

let centralErrorHandler: any;
let asyncHandler: any;
let AppError: any;
let ForbiddenError: any;

function createMockReply() {
  const reply: any = {
    status: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

function createMockRequest() {
  return {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as any;
}

// Load modules synchronously for tests
const mod = await import('./errorHandler.js');
const { centralErrorHandler, asyncHandler, AppError, ForbiddenError } = mod;

describe('centralErrorHandler', () => {
  let reply: any;
  let request: any;

  beforeEach(() => {
    vi.clearAllMocks();
    reply = createMockReply();
    request = createMockRequest();
  });

  it('handles ZodError with 400', () => {
    const schema = z.object({ a: z.number() });
    let error: unknown;
    try {
      schema.parse({ a: 'x' });
    } catch (e) {
      error = e;
    }

    centralErrorHandler(error as any, request, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });

  it('handles AppError with its status', () => {
    const appErr = new ForbiddenError('Nope');
    centralErrorHandler(appErr as any, request, reply);
    expect(request.log.warn).toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'FORBIDDEN' }) }),
    );
  });

  it('handles Fastify validation error', () => {
    const fastifyErr = { validation: [{ field: 'a' }] } as any;
    centralErrorHandler(fastifyErr, request, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });

  it('handles unexpected error with 500', () => {
    const err = new Error('boom');
    centralErrorHandler(err as any, request, reply);
    expect(request.log.error).toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'INTERNAL_ERROR' }) }),
    );
  });
});

describe('asyncHandler', () => {
  it('returns resolved value', async () => {
    const fn = async () => 'ok';
    const wrapped = asyncHandler(fn);
    await expect(wrapped()).resolves.toBe('ok');
  });

  it('rethrows rejected promise and logs', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fn = async () => { throw new Error('fail'); };
    const wrapped = asyncHandler(fn);
    await expect(wrapped()).rejects.toThrow('fail');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('catches sync throw and rejects', async () => {
    const fn = (() => { throw new AppError('X', 'Y'); }) as unknown as () => Promise<unknown>;
    const wrapped = asyncHandler(fn);
    await expect(wrapped()).rejects.toBeInstanceOf(AppError);
  });
});
