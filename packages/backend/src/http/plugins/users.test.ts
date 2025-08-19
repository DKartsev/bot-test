import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import usersPlugin from './users.js';

interface MockApp extends Partial<FastifyInstance> {
	_getHandler?: (req: unknown, reply: unknown) => unknown | Promise<unknown>;
	_postHandler?: (req: unknown, reply: any) => unknown | Promise<unknown>;
}

describe('users plugin', () => {
	let app: MockApp;
	let repo: {
		list: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		findByEmail: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		app = {
			get: vi.fn((path: string, handler: (req: unknown, reply: unknown) => unknown) => {
				app._getHandler = handler;
			}),
			post: vi.fn((path: string, handler: (req: unknown, reply: any) => unknown) => {
				app._postHandler = handler;
			}),
		} as unknown as MockApp;

		repo = {
			list: vi.fn(),
			create: vi.fn(),
			findByEmail: vi.fn(),
		};
	});

	it('registers routes and returns users list', async () => {
		await usersPlugin(app as unknown as FastifyInstance, { repo } as unknown as { repo: any });

		expect(app.get).toHaveBeenCalledWith('/users', expect.any(Function));

		repo.list.mockResolvedValue({ items: [{ id: '1', email: 'a@b.c', name: 'Alice' }], nextCursor: undefined });
		const res = await app._getHandler?.({} as unknown, {} as unknown);
		expect(res).toEqual({ items: [{ id: '1', email: 'a@b.c', name: 'Alice' }] });

		repo.list.mockResolvedValue({ items: [], nextCursor: 'cursor-2' });
		const res2 = await app._getHandler?.({} as unknown, {} as unknown);
		expect(res2).toEqual({ items: [], nextCursor: 'cursor-2' });
	});

	it('creates user and sets 201 status', async () => {
		await usersPlugin(app as unknown as FastifyInstance, { repo } as unknown as { repo: any });
		expect(app.post).toHaveBeenCalledWith('/users', expect.any(Function));

		repo.create.mockResolvedValue({ id: '2', email: 'bob@example.com', name: 'Bob' });
		const reply = { code: vi.fn().mockReturnThis() };
		const req = { body: { name: 'Bob', email: 'bob@example.com' } } as unknown;
		const created = await app._postHandler?.(req, reply);
		expect(reply.code).toHaveBeenCalledWith(201);
		expect(created).toEqual({ id: '2', email: 'bob@example.com', name: 'Bob' });
	});
});
