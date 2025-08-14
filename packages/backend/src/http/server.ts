import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
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

export async function buildServer(deps: AppDeps) {
  const app = Fastify({
    // Using the simple logger config for now to pass type checks.
    // A more advanced pino-pretty setup can be configured later if needed.
    logger: true,
  });

  // Decorate the app instance with our dependencies, so they are available in routes
  app.decorate("deps", deps);

  // Core plugins
  await app.register(cors as any, { origin: env.CORS_ORIGIN });
  await app.register(sensible as any);

  // Documentation plugins
  if (env.ENABLE_DOCS) {
    await app.register(swagger as any, {
      openapi: {
        info: {
          title: "Bot API",
          version: "1.0.0",
          description: "API for the support bot and admin panel.",
        },
      },
    });
    await app.register(swaggerUi as any, { routePrefix: "/docs" });
  }

  // App plugins
  await app.register(healthPlugin as any, { prefix: "/api" });
  await app.register(usersPlugin as any, {
    prefix: "/api",
    repo: deps.userRepo,
  });
  await app.register(telegramPlugin as any);
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
      pool: any;
      connect(): Promise<any>;
      query<T = any>(q: string, values?: any[]): Promise<{ rows: T[] }>;
    };
    authenticate: (req: any, reply: any) => Promise<void>;
    authorize: (allowedRoles: ("admin" | "operator")[]) => (req: any, reply: any) => Promise<void>;
  }
}
