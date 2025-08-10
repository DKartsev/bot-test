import express from 'express';
import { applySecurity } from './http/bootstrap/security.js';
import { errorHandler } from './http/middleware/errorHandler.js';
import { buildRoutes } from './http/routes.js';
import { applyObservability } from './http/bootstrap/observability.js';
import { applyDocs } from './http/bootstrap/docs.js';
import type { IUserRepo } from './modules/users/domain/User.js';
import { randomUUID } from 'crypto';
import { withCtx } from './shared/context.js';

export function createApp(deps: { userRepo: IUserRepo, health?: { db: () => Promise<boolean> } }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use((req, _res, next) => {
    const requestId = (req.header('x-request-id') as string) || randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).id = requestId;
    withCtx({ requestId }, next);
  });
  applyObservability(app);
  applySecurity(app);
  app.use('/api', buildRoutes(deps));
  applyDocs(app);
  if (process.env.ADMIN_STATIC_DIR) {
    app.use('/admin', express.static(process.env.ADMIN_STATIC_DIR));
  }
  app.use(errorHandler);
  return app;
}
