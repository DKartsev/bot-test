import { describe, it, expect } from "vitest";
import { buildServer } from "./server.js";
import type { IUserRepo } from "../modules/users/domain/User.js";

const createServer = async (repo?: Partial<IUserRepo>) => {
  const baseRepo: IUserRepo = {
    findByEmail: async () => null,
    create: async ({ email, name }) => ({ id: "1", email, name }),
    list: async () => ({ items: [], nextCursor: undefined }),
  };
  const app = await buildServer({ userRepo: { ...baseRepo, ...repo } });
  await app.ready();
  return app;
};

describe("health", () => {
  it("returns ok", async () => {
    const app = await createServer();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});

describe("users register", () => {
  it("registers user", async () => {
    const app = await createServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/users/register",
      payload: { email: "a@test.com", name: "A" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email: "a@test.com", name: "A" });
    await app.close();
  });
});
