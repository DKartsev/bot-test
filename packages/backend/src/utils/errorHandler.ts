import { FastifyRequest, FastifyReply } from "fastify";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
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
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

export class UpstreamApiError extends AppError {
  constructor(message: string = "Bad Gateway") {
    super(message, 502);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service Unavailable") {
    super(message, 503);
  }
}

export function centralErrorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    request.log.warn(
      { err: error, isOperational: error.isOperational },
      "Application error occurred",
    );
    return reply.status(error.statusCode).send({
      error: {
        message: error.message,
        code: error.constructor.name,
      },
    });
  }

  // Log unexpected errors
  request.log.error({ err: error }, "An unexpected error occurred");

  return reply.status(500).send({
    error: {
      message: "Internal Server Error",
      code: "UnexpectedError",
    },
  });
}
