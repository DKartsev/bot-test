import type { Request, Response, NextFunction } from 'express';
import { redis } from '../../infra/redis.js';
export async function idempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.header('idempotency-key'); if (!key) return next();
  const hit = await redis.get(key); if (hit) return res.status(409).json({ error:'IDEMPOTENT_REPLAY' });
  await redis.setex(key, 60 * 10, 'used'); // 10 min
  return next();
}
