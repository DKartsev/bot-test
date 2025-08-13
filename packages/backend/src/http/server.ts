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
import { centralErrorHandler } from "../utils/errorHandler.js";

export interface AppDeps {
  qaService: QAService;
  bot: Bot;
  eventBus: EventBus;
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
  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(sensible);

  // Documentation plugins
  if (env.ENABLE_DOCS) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: "Bot API",
          version: "1.0.0",
          description: "API for the support bot and admin panel.",
        },
      },
    });
    await app.register(swaggerUi, { routePrefix: "/docs" });
  }

  // App plugins
  await app.register(healthPlugin, { prefix: "/api" });
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
