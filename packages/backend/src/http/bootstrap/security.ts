import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';

export function applySecurity(app: Express) {
  app.use(helmet());
  app.use(cors({ origin: (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean) }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
}
