import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
export const validateResponse = (schema: ZodSchema) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    const send = res.json.bind(res);
    res.json = (body: any) => {
      if (process.env.NODE_ENV !== 'production') {
        const ok = schema.safeParse(body);
        if (!ok.success) console.warn('Response schema mismatch', ok.error.issues);
      }
      return send(body);
    };
    next();
  };
};
