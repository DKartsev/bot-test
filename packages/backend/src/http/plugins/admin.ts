import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
<<<<<<< HEAD
=======
import fp from "fastify-plugin";
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
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

const { ADMIN_IP_ALLOWLIST, ADMIN_RATE_LIMIT_MAX } = env;

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

<<<<<<< HEAD
// Define User interface locally
interface User {
  id: string;
  email: string;
  name: string;
  role?: "admin" | "operator";
}
=======
import type { User } from "@app/shared";
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1

declare module "fastify" {
  interface FastifyRequest {
    user?: User & { role: "admin" | "operator" };
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

<<<<<<< HEAD
// --- The Plugin ---
const adminPlugin: FastifyPluginAsync = async (server, _opts) => {
  // 1. Authentication and Authorization Hooks
  // This hook verifies the JWT and decorates the request with the user payload.
  server.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply) => {
      // TODO: Implement JWT verification
      req.log.warn("JWT verification not implemented yet");
    },
  );

  // This hook checks if the user has the required role.
  server.decorate(
    "authorize",
    (allowedRoles: ("admin" | "operator")[]) =>
=======
const adminPlugin: FastifyPluginAsync = async (server) => {
  // 1. Authentication decorator
  server.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : 
                   req.headers['x-admin-token'] as string;
      
      if (!token) {
        return reply.code(401).send({ error: "Missing authentication token" });
      }
      
      const validTokens = env.ADMIN_API_TOKENS;
      if (!validTokens.includes(token)) {
        return reply.code(401).send({ error: "Invalid authentication token" });
      }
      
      // Mock user for now - in real app this would decode JWT
      req.user = {
        id: "admin-user",
        email: "admin@example.com", 
        name: "Admin User",
        role: "admin"
      };
    },
  );

  // 2. Authorization decorator
  server.decorate(
    "authorize",
    (allowedRoles: string[]) =>
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.user || typeof req.user.role !== "string") {
          return reply.code(403).send({ error: "Forbidden: Missing role" });
        }
        if (!allowedRoles.includes(req.user.role)) {
          return reply
            .code(403)
            .send({ error: "Forbidden: Insufficient permissions" });
        }
      },
  );

<<<<<<< HEAD
  // 2. Register Admin-specific Rate Limiting
  await server.register(rateLimit as any, {
=======
  // 3. Register Admin-specific Rate Limiting
  await server.register(rateLimit, {
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
    max: ADMIN_RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    keyGenerator: (req: FastifyRequest) => req.user?.id || req.ip,
  });

<<<<<<< HEAD
  // 3. Add security hooks that apply to all routes registered within this plugin
=======
  // 4. Add security hooks
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
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

<<<<<<< HEAD
  // 4. Register routes
=======
  // 5. Register routes
>>>>>>> 5524c501951c1608ff853d8f0341a899e49adbe1
  await server.register(askBotRoutes);
  await server.register(casesRoutes);
  await server.register(categoriesRoutes);
  await server.register(conversationsRoutes);
  await server.register(notesRoutes);
  await server.register(savedRepliesRoutes);
  await server.register(streamRoutes);
  await server.register(chatsRoutes);
  await server.register(usersRoutes);

  server.log.info("Admin plugin registered with security hooks and routes.");
};

