import { Router } from 'express';
import { usersRoutes } from '../modules/users/http/routes.js';
import type { IUserRepo } from '../modules/users/domain/User.js';

export function buildRoutes(deps: { userRepo: IUserRepo, health?: { db: () => Promise<boolean> } }) {
  const r = Router();
  r.get('/livez', (_req, res) => res.send('OK'));
  r.get('/readyz', async (_req, res) => {
    const ok = await (deps.health?.db?.() ?? Promise.resolve(true));
    return ok ? res.send('OK') : res.status(503).send('NOT_READY');
  });
  r.get('/health', (_req, res) => res.json({ ok: true }));
  r.use('/users', usersRoutes(deps.userRepo));
  return r;
}
