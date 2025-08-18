import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { env } from "../../config/env.js";

// Import routes
import askBotRoutes from "../routes/admin/ask-bot.js";
import casesRoutes from "../routes/admin/cases.js";
import categoriesRoutes from "../routes/admin/categories.js";
import conversationsRoutes from "../routes/admin/conversations/index.js";
import notesRoutes from "../routes/admin/notes.js";
import savedRepliesRoutes from "../routes/admin/saved-replies.js";
import streamRoutes from "../routes/admin/stream.js";
import chatsRoutes from "../routes/admin/chats/index.js";
import usersRoutes from "../routes/admin/users.js";
import telegramRoutes from "../routes/admin/telegram.js";

const { ADMIN_IP_ALLOWLIST, ADMIN_RATE_LIMIT_MAX } = env;

// --- IP Allowlist Logic ---
function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function matchIp(ip: string, rule: string): boolean {
  if (rule.includes("/")) {
    const parts = rule.split("/");
    const range = parts[0];
    const bits = parts[1];
    if (range === undefined || bits === undefined) {
      return false;
    }
    const mask = -1 << (32 - Number(bits));
    return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
  }
  return ip === rule;
}

// Define User interface locally
interface User {
  id: string;
  email: string;
  name: string;
  role?: "admin" | "operator";
}

declare module "fastify" {
  interface FastifyRequest {
    user?: User & { role: "admin" | "operator" };
  }
}

// --- The Plugin ---
const adminPlugin: FastifyPluginAsync = async (server, _opts) => {
  // 2. Register Admin-specific Rate Limiting
  await server.register(rateLimit as any, {
    max: ADMIN_RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    keyGenerator: (req: FastifyRequest) => req.user?.id || req.ip,
  });

  // 3. Add security hooks that apply to all routes registered within this plugin
  server.addHook(
    "onRequest",
    (req: FastifyRequest, reply: FastifyReply, done) => {
      // IP Allowlist Check
      if (ADMIN_IP_ALLOWLIST && ADMIN_IP_ALLOWLIST.length > 0) {
        const ip =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.ip;
        const allowed = ADMIN_IP_ALLOWLIST.some((rule) => matchIp(ip, rule));
        if (!allowed) {
          req.log.warn({ ip }, "Admin IP rejected by allowlist");
          return reply.code(403).send({ error: "Forbidden" });
        }
      }
      done();
    },
  );

  // 4. Register routes
  await server.register(askBotRoutes);
  await server.register(casesRoutes);
  await server.register(categoriesRoutes);
  await server.register(conversationsRoutes);
  await server.register(notesRoutes);
  await server.register(savedRepliesRoutes);
  await server.register(streamRoutes);
  await server.register(chatsRoutes);
  await server.register(usersRoutes);
  await server.register(telegramRoutes);

  // Lightweight status for admin panel discovery
  server.get("/admin/status", async () => ({
    status: "ok",
    service: "bot-test-backend",
    endpoints: {
      health: "/api/health",
      conversations: "/api/admin/conversations",
      messages: "/api/admin/conversations/:id/messages",
      metrics: "/api/admin/metrics",
      faq: "/api/admin/faq",
      stream: "/api/admin/stream",
    },
    timestamp: new Date().toISOString(),
  }));

  server.log.info("🔐 Admin плагин зарегистрирован с защитными хуками и маршрутами");
};

export default adminPlugin;

