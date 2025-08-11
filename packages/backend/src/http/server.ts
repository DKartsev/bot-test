import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { healthPlugin } from "./plugins/health.js";
import { usersPlugin } from "./plugins/users.js";
import { mapDomainError } from "./errors.js";
import type { IUserRepo } from "../modules/users/domain/User.js";

export async function buildServer(deps: { userRepo: IUserRepo }) {
  const app = Fastify({ logger: true });

  await app.register(helmet);
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await app.register(sensible);

  await app.register(swagger, {
    openapi: {
      info: { title: "API", version: "1.0.0" },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(healthPlugin, { prefix: "/api" });
  await app.register(usersPlugin, { prefix: "/api", repo: deps.userRepo });

  app.setErrorHandler((err, req, reply) => {
    req.log.error(err);
    if ((err as any).validation) {
      reply.status(400).send({ error: "VALIDATION_ERROR" });
      return;
    }
    const mapped = mapDomainError(err);
    reply
      .status(mapped.status)
      .send({ error: mapped.message, code: mapped.code });
  });

  return app;
}
