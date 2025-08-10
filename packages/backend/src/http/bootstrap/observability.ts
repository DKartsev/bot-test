import pino from 'pino';
import pinoHttp from 'pino-http';
import type { Express } from 'express';
import client from 'prom-client';

export const logger = pino({ level: process.env.LOG_LEVEL || 'info', redact: ['req.headers.authorization'] });

export function applyObservability(app: Express) {
  // @ts-expect-error pino-http CJS
  app.use(pinoHttp({ logger, genReqId: req => (req.id as string) }));
  client.collectDefaultMetrics();
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
}
