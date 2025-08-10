import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../utils/errorHandler';

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Query validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
}

export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Params validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
}

// Common validation schemas
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});