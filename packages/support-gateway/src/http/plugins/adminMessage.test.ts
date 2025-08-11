import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { describe, it, expect, beforeEach } from "vitest";
import { SignJWT } from "jose";
import adminMessage from "./adminMessage";
import { adminGuard } from "../middlewares/adminGuard";
import { vi } from "vitest";

vi.mock("../../services/ragService", () => ({
  generateResponse: vi.fn(async () => "ok"),
}));

const secret = new TextEncoder().encode("test-secret");

async function buildApp() {
  const app = Fastify();
  await app.register(rateLimit, {
    max: Number(process.env.ADMIN_RATE_LIMIT_MAX || "2"),
    timeWindow: "1 minute",
    keyGenerator: (req) =>
      String(
        req.headers["x-admin-api-key"] ||
          (req.headers.authorization || "").slice("Bearer ".length) ||
          req.ip,
      ),
  });
  app.addHook("preHandler", adminGuard);
  await app.register(adminMessage, { prefix: "/api/admin" });
  await app.ready();
  // debug
  // console.log(app.printRoutes());
  return app;
}

describe("/api/admin/message", () => {
  let adminToken: string;
  let userToken: string;
  beforeEach(async () => {
    process.env.JWT_PUBLIC_KEY = "test-secret";
    process.env.JWT_ISSUER = "app://core";
    process.env.JWT_AUDIENCE = "admin";
    process.env.ADMIN_API_TOKENS = "adminkey";
    process.env.ADMIN_RATE_LIMIT_MAX = "2";
    adminToken = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("app://core")
      .setAudience("admin")
      .setExpirationTime("1h")
      .sign(secret);
    userToken = await new SignJWT({ role: "user" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("app://core")
      .setAudience("admin")
      .setExpirationTime("1h")
      .sign(secret);
  });

  it("rejects missing token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/message",
      payload: { message: "hi" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects non-admin token", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/message",
      payload: { message: "hi" },
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it.skip("accepts admin api key", async () => {
    // TODO: implement test once server refactor stabilizes
  });

  it.skip("enforces rate limit", async () => {
    // TODO: implement test once server refactor stabilizes
  });
});
