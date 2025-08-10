import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny } from 'zod';
export const validate = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).validated = parsed.data; next();
};
