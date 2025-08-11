import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { describe, it, expect, beforeEach } from "vitest";
import adminMessage from "./adminMessage";
import adminGuard from "../middlewares/adminGuard";
import { vi } from "vitest";

vi.mock("../../services/ragService", () => ({
  generateResponse: vi.fn(async () => "ok"),
}));

async function buildApp() {
  const app = Fastify();
  await app.register(rateLimit, {
    max: Number(process.env.ADMIN_RATE_LIMIT_MAX || "2"),
    timeWindow: "1 minute",
    keyGenerator: (req) =>
      String(
        req.headers["x-admin-token"] ||
          (req.headers.authorization || "").slice("Bearer ".length) ||
          req.ip,
      ),
  });
  app.addHook("preHandler", adminGuard);
  await app.register(adminMessage);
  await app.ready();
  return app;
}

describe("/api/admin/message", () => {
  beforeEach(() => {
    process.env.ADMIN_API_TOKENS = "adminkey";
    process.env.ADMIN_RATE_LIMIT_MAX = "2";
  });

  it("accepts valid token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/message",
      payload: { text: "hi" },
      headers: {
        Authorization: "Bearer adminkey",
        "content-type": "application/json",
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects missing token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/message",
      payload: { text: "hi" },
      headers: { "content-type": "application/json" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects invalid token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/message",
      payload: { text: "hi" },
      headers: {
        Authorization: "Bearer wrong",
        "content-type": "application/json",
      },
    });
    expect(res.statusCode).toBe(401);
  });
});
