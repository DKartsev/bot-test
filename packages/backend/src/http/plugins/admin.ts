import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { env } from "../../config/env.js";

// Import routes
import askBotRoutes from "../routes/admin/ask-bot.js";
import casesRoutes from "../routes/admin/cases.js";
import categoriesRoutes from "../routes/admin/categories.js";
import conversationsRoutes from "../routes/admin/conversations.js";
import notesRoutes from "../routes/admin/notes.js";
import savedRepliesRoutes from "../routes/admin/saved-replies.js";
import streamRoutes from "../routes/admin/stream.js";

const { ADMIN_IP_ALLOWLIST, ADMIN_RATE_LIMIT_MAX, ADMIN_API_TOKENS } = env;

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

// --- Admin Auth Guard ---
function adminGuard(
  req: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void,
) {
  let token: string | undefined;
  const auth = req.headers.authorization;

  if (auth?.startsWith("Bearer ")) {
    token = auth.slice("Bearer ".length).trim();
  } else if (typeof req.headers["x-admin-token"] === "string") {
    token = String(req.headers["x-admin-token"]).trim();
  }

  if (token && ADMIN_API_TOKENS.includes(token)) {
    done();
    return;
  }

  req.log.warn({ ip: req.ip }, "Admin authentication failed");
  void reply.code(401).send({ error: "Unauthorized" });
  done(new Error("Unauthorized"));
}

// --- The Plugin ---
const adminPlugin: FastifyPluginAsync = async (server) => {
  // 1. Register Admin-specific Rate Limiting
  await server.register(rateLimit, {
    max: ADMIN_RATE_LIMIT_MAX,
    timeWindow: "1 minute",
    keyGenerator: (req: FastifyRequest) =>
      (req.headers["x-admin-token"] as string) ||
      (req.headers.authorization || "").slice("Bearer ".length) ||
      req.ip,
  });

  // 2. Add security hooks that apply to all routes registered within this plugin
  server.addHook(
    "onRequest",
    (req: FastifyRequest, reply: FastifyReply, done) => {
      if (ADMIN_IP_ALLOWLIST && ADMIN_IP_ALLOWLIST.length > 0) {
        const ip =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.ip;
        const allowed = ADMIN_IP_ALLOWLIST.some((rule) => matchIp(ip, rule));
        if (!allowed) {
          req.log.warn({ ip }, "Admin IP rejected by allowlist");
          void reply.code(403).send({ error: "Forbidden" });
          return;
        }
      }
      done();
    },
  );

  server.addHook("preHandler", adminGuard);

  // 3. Register routes
  await server.register(askBotRoutes);
  await server.register(casesRoutes);
  await server.register(categoriesRoutes);
  await server.register(conversationsRoutes);
  await server.register(notesRoutes);
  await server.register(savedRepliesRoutes);
  await server.register(streamRoutes);

  server.log.info("Admin plugin registered with security hooks and routes.");
};

export default fp(adminPlugin);
