import { Router } from "express";
import { z } from "zod";
import { validate } from "../../../http/middleware/validate.js";
import { idempotency } from "../../../http/middleware/idempotency.js";
import { mapDomainError } from "../../../http/errors/map.js";
import { ListQuery } from "../../../validation/pagination.js";
import {
  CreateUserSchema,
  UserListResponse,
  UserSchema,
} from "../../../validation/schemas.js";
import { validateResponse } from "../../../http/middleware/responseValidate.js";
import { UserService } from "../app/UserService.js";
import type { IUserRepo } from "../domain/User.js";

export const usersRoutes = (repo: IUserRepo) => {
  const router = Router();
  const service = new UserService(repo);

  router.get(
    "/",
    validate(z.object({ query: ListQuery })),
    validateResponse(UserListResponse),
    async (req, res, next) => {
      try {
        const { cursor, limit } = (req as any).validated.query as {
          cursor?: string;
          limit: number;
        };
        const result = await repo.list({ cursor, limit });
        res.json(result);
      } catch (e) {
        next(e);
      }
    },
  );

  router.post(
    "/",
    idempotency,
    validate(CreateUserSchema),
    validateResponse(UserSchema),
    async (req, res, next) => {
      try {
        const { email, name } = req.body;
        const user = await service.register(email, name);
        res.status(201).json(user);
      } catch (e) {
        next(mapDomainError(e));
      }
    },
  );

  return router;
};
