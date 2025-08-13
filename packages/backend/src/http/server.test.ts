import { describe, it, expect } from "vitest";
import { buildServer } from "./server.js";
const createServer = async () => {
  const app = await buildServer({
    qaService: {} as any,
    bot: {} as any,
    eventBus: {} as any,
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
      headers: { Authorization: "Bearer test-token" },
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
      headers: { Authorization: "Bearer test-token" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email: "a@test.com", name: "A" });
    await app.close();
  });
});
