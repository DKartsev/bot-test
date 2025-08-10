import { Router } from 'express';
import { usersRoutes } from '../modules/users/http/routes.js';
import type { IUserRepo } from '../modules/users/domain/User.js';

export function buildRoutes(deps: { userRepo: IUserRepo }) {
  const r = Router();
  r.get('/health', (_req, res) => res.json({ ok: true }));
  r.use('/users', usersRoutes(deps.userRepo));
  return r;
}
