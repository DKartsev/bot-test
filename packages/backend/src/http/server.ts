import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { env } from "../config/env.js";
import { QAService } from "../app/qa/QAService.js";
import { Bot } from "../bot/bot.js";
import { EventBus } from "../app/events.js";
import healthPlugin from "./plugins/health.js";
import telegramPlugin from "./plugins/telegram.js";
import adminPlugin from "./plugins/admin.js";
import apiPlugin from "./plugins/api.js";
import usersPlugin from "./plugins/users.js";
import { centralErrorHandler } from "../utils/errorHandler.js";

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

export interface AppDeps {
  qaService: QAService;
  bot: Bot;
  eventBus: EventBus;
  userRepo: IUserRepo;
}

export async function buildServer(deps: AppDeps): Promise<import('fastify').FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  // Decorate the app instance with our dependencies, so they are available in routes
  app.decorate("deps", deps);

  // Set global app for legacy code compatibility
  if (typeof globalThis !== 'undefined') {
    (globalThis as unknown as { app: unknown }).app = {
      log: {
        info: (obj: unknown, msg: string) => app.log.info(obj, msg),
        warn: (msg: string) => app.log.warn(msg),
        error: (obj: unknown, msg: string) => app.log.error(obj, msg),
      },
    };
  }

  // Core plugins
  await app.register(cors as any, { origin: env.CORS_ORIGIN });
  await app.register(sensible as any);

  // Documentation plugins
  if (env.ENABLE_DOCS) {
    await app.register(fastifySwagger as any, {
      openapi: {
        info: {
          title: "Bot API",
          version: "1.0.0",
          description: "API for the support bot and admin panel.",
        },
        servers: [
          {
            url: env.PUBLIC_URL || "http://localhost:3000",
            description: "Development server",
          },
        ],
      },
    });
    await app.register(fastifySwaggerUi as any, { 
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // App plugins
  await app.register(healthPlugin as any, { prefix: "/api" });
  await app.register(usersPlugin as any, {
    prefix: "/api",
    repo: deps.userRepo,
  });
  await app.register(telegramPlugin);

  // Register authentication and authorization functions BEFORE admin plugin
  app.decorate(
    "authenticate",
    async (req: import("fastify").FastifyRequest, _reply: import("fastify").FastifyReply) => {
      // TODO: Implement JWT verification
      req.log.warn("JWT verification not implemented yet");
    },
  );

  app.decorate(
    "authorize",
    (allowedRoles: ("admin" | "operator")[]) =>
      async (req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => {
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

  // Ensure decorators are ready before registering admin plugin
  await app.ready();

  await app.register(adminPlugin as any, { prefix: "/api/admin" });
  await app.register(apiPlugin as any, { prefix: "/api" });

  // Centralized error handler
  app.setErrorHandler(centralErrorHandler);

  return app;
}

// Augment the FastifyInstance interface with our dependencies
declare module "fastify" {
  export interface FastifyInstance {
    deps: AppDeps;
    pg: {
      pool: import("pg").Pool;
      connect(): Promise<import("pg").PoolClient>;
      query<T = unknown>(q: string, values?: unknown[]): Promise<{ rows: T[] }>;
    };
    authenticate: (req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
    authorize: (allowedRoles: ("admin" | "operator")[]) => (req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
  }
}
