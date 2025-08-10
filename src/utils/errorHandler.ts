import { logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export function handleError(error: Error, req?: any): { statusCode: number; message: string } {
  if (error instanceof AppError) {
    if (req?.log) {
      req.log.warn({ err: error }, 'Application error');
    } else {
      logger.warn({ err: error }, 'Application error');
    }
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  // Log unexpected errors
  if (req?.log) {
    req.log.error({ err: error }, 'Unexpected error');
  } else {
    logger.error({ err: error }, 'Unexpected error');
  }

  return {
    statusCode: 500,
    message: 'Internal server error',
  };
}

export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      const { statusCode, message } = handleError(error, req);
      res.status(statusCode).json({ error: message });
    });
  };
}