import pino from 'pino';
import { env } from '../config/env.js';

// Create a single, unified logger instance
// The logger is configured in `server.ts` to use pino-pretty in development
// This file provides the base logger and helper functions.

const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.headers["x-admin-token"]',
      'password',
      'token',
      'apiKey',
      '*.secret',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
});

export { logger };
