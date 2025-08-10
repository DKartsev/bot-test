import { Router } from 'express';
import { validate } from '../../../http/middleware/validate.js';
import { idempotency } from '../../../http/middleware/idempotency.js';
import { mapDomainError } from '../../../http/errors/map.js';
import { CreateUserSchema } from '../../../validation/schemas.js';
import { UserService } from '../app/UserService.js';
import type { IUserRepo } from '../domain/User.js';

export const usersRoutes = (repo: IUserRepo) => {
  const router = Router();
  const service = new UserService(repo);

  router.post('/', idempotency, validate(CreateUserSchema), async (req, res, next) => {
    try {
      const { email, name } = req.body;
      const user = await service.register(email, name);
      res.status(201).json(user);
    } catch (e) { next(mapDomainError(e)); }
  });

  return router;
};
