import { describe, it, expect, vi } from "vitest";
import { buildServer } from "./server.js";
import { QAService } from "../app/qa/QAService.js";
import { Bot } from "../bot/bot.js";
import { EventBus } from "../app/events.js";

interface User {
  id: string;
  email: string;
  name: string;
}

interface IUserRepo {
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; name: string }): Promise<User>;
  list(opts: { limit: number; cursor?: string }): Promise<{
    items: User[];
    nextCursor?: string;
  }>;
}

const createServer = async (repo?: Partial<IUserRepo>) => {
  const baseRepo: IUserRepo = {
    findByEmail: () => Promise.resolve(null),
    create: ({ email, name }: { email: string; name: string }) => Promise.resolve({ id: "1", email, name }),
    list: () => Promise.resolve({ items: [] }),
  };
  const app = await buildServer({
    userRepo: { ...baseRepo, ...repo },
    qaService: {} as QAService,
    bot: {} as Bot,
    eventBus: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    } as unknown as EventBus,
  });
  await app.ready();
  return app;
};

describe("health", () => {
  it("returns ok", async () => {
    const app = await createServer();
    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });
});

describe("users register", () => {
  it("registers user", async () => {
    const app = await createServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/users",
      payload: { email: "a@test.com", name: "A" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email: "a@test.com", name: "A" });
    await app.close();
  });
});
