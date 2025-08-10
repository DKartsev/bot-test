import pino from 'pino';
import { env } from '../config/environment';

// Create base logger with consistent configuration
const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'password',
      'token',
      'apiKey',
    ],
    censor: '[REDACTED]',
  },
});

// Request logger with correlation ID
export function withRequest(req: any) {
  const correlationId = req.id || req.headers['x-correlation-id'] || generateCorrelationId();
  return logger.child({ 
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
  });
}

// Tenant-aware logger
export function withTenant(tenant: any, baseLogger = logger) {
  if (!tenant) return baseLogger;
  return baseLogger.child({ 
    tenantId: tenant.orgId,
    projectId: tenant.projectId,
  });
}

function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export { logger };