import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { env } from "../config/env.js";
import { QAService } from "../app/qa/QAService.js";
import { Bot } from "../bot/bot.js";
import { EventBus } from "../app/events.js";
import type { IUserRepo } from "@app/shared";
import healthPlugin from "./plugins/health.js";
import telegramPlugin from "./plugins/telegram.js";
import adminPlugin from "./plugins/admin.js";
import apiPlugin from "./plugins/api.js";
import usersPlugin from "./plugins/users.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { centralErrorHandler } from "./utils/errorHandler.js";

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

  // Add Zod validator and serializer
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Decorate the app instance with our dependencies, so they are available in routes
  app.decorate("deps", deps);

  // Set global app for legacy code compatibility
  if (typeof globalThis !== 'undefined') {
    globalThis.app = {
      log: {
        info: (obj: unknown, msg: string) => app.log.info(obj, msg),
        warn: (msg: string) => app.log.warn(msg),
        error: (obj: unknown, msg: string) => app.log.error(obj, msg),
      },
    };
  }

  // Core plugins
  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(sensible);

  // Documentation plugins
  if (env.ENABLE_DOCS) {
    await app.register(fastifySwagger, {
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
    await app.register(fastifySwaggerUi, { 
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }

  // App plugins
  await app.register(healthPlugin, { prefix: "/api" });
  await app.register(usersPlugin, { prefix: "/api" });
  await app.register(telegramPlugin);
  await app.register(adminPlugin, { prefix: "/api/admin" });
  await app.register(apiPlugin, { prefix: "/api" });

  // Centralized error handler
  app.setErrorHandler(centralErrorHandler);

  return app;
}

// Augment the FastifyInstance interface with our dependencies
declare module "fastify" {
  export interface FastifyInstance {
    deps: AppDeps;
  }
}
