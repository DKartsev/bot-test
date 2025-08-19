import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export function centralErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    request.log.warn({ error: error.issues }, 'Validation error');
    void reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.issues,
      },
    });
    return;
  }

  // Handle custom application errors
  if (error instanceof AppError) {
    request.log.warn(
      {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      },
      'Application error occurred',
    );

    void reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    request.log.warn({ error: error.validation }, 'Fastify validation error');
    void reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      },
    });
    return;
  }

  // Log unexpected errors
  request.log.error({ err: error }, 'Unexpected error occurred');

  void reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal Server Error',
    },
  });
}

export function asyncHandler<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      return result.catch((error: unknown) => {
        console.error('Async handler error:', error);
        throw error;
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }) as unknown as T;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error({ err: reason, promise }, 'Unhandled Rejection');
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error: Error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});
