import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.code, message: err.message, meta: err.meta });
  return res.status(500).json({ error: 'INTERNAL_ERROR' });
}
