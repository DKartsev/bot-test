import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApi } from '../../validation/openapi.js';

export function applyDocs(app: Express) {
  const doc = generateOpenApi();
  app.get('/openapi.json', (_req, res) => res.json(doc));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(doc));
}
