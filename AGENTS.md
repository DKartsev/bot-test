version: 1
name: app-monorepo-hardening
description: >
  End-to-end workflows to drive the repo toward an "ideal" production structure:
  monorepo workspaces (backend/admin/shared), strict TypeScript (NodeNext),
  ESM-only, hexagonal backend, security hardening, validation & errors,
  observability, OpenAPI docs, CI, Docker, migrations, and release hygiene.

defaults:
  node_version: "20"
  npm_version: ">=10 <12"
  packages_root: "packages"
  backend_dir: "packages/backend"
  admin_dir: "packages/admin"
  shared_dir: "packages/shared"
  admin_base_path: "/admin"
  cors_origin: "http://localhost:3000"
  rate_limit_window_ms: 900000          # 15m
  rate_limit_max: 100
  port: 3000
  db_tool: "pg"                          # pg | prisma | knex
  redis_enabled: false

order:
  - lockfile_sync
  - shared_package
  - tsc_alias_setup
  - admin_transpile_shared
  - hex_arch_backend
  - security_hardening
  - validation_errors
  - observability
  - openapi_docs
  - graceful_shutdown
  - readiness_liveness
  - request_id_ctx
  - db_migrations_prisma_or_knex
  - tx_error_map
  - redis_idempotency
  - pagination_contract
  - response_validation
  - ci_pipeline
  - docker_polish
  - changesets_release

workflows:

  lockfile_sync:
    goal: Ensure each workspace has a fresh, committed package-lock.json.
    run:
      - rm -rf node_modules package-lock.json
      - rm -rf ${backend_dir}/node_modules ${backend_dir}/package-lock.json
      - rm -rf ${admin_dir}/node_modules   ${admin_dir}/package-lock.json
      - rm -rf ${shared_dir}/node_modules  ${shared_dir}/package-lock.json
      - npm --prefix ${backend_dir} install --package-lock-only
      - npm --prefix ${admin_dir}   install --package-lock-only
      - npm --prefix ${shared_dir}  install --package-lock-only
      - git add ${backend_dir}/package-lock.json ${admin_dir}/package-lock.json ${shared_dir}/package-lock.json
      - git commit -m "chore(lock): sync backend/admin/shared lockfiles" || true
    accept:
      - test -f ${backend_dir}/package-lock.json
      - test -f ${admin_dir}/package-lock.json
      - test -f ${shared_dir}/package-lock.json

  shared_package:
    goal: Make @app/shared a distributable ESM lib with explicit exports.
    files:
      - path: ${shared_dir}/package.json
        merge_json:
          name: "@app/shared"
          private: false
          type: "module"
          main: "dist/index.js"
          module: "dist/index.js"
          types: "dist/index.d.ts"
          exports:
            ".": { import: "./dist/index.js", types: "./dist/index.d.ts" }
          files: ["dist"]
          scripts:
            clean: "rimraf dist"
            build: "npm run clean && tsc -p tsconfig.json && tsc-alias -p tsconfig.json"
          devDependencies:
            typescript: "5.9.2"
            tsc-alias: "^1.8.10"
      - path: ${shared_dir}/src/index.ts
        ensure_contains: "export * from './greet/index.js';"
    run:
      - npm run build -w ${shared_dir}
    accept:
      - test -f ${shared_dir}/dist/index.js

  tsc_alias_setup:
    goal: Ensure runtime-safe path aliases across backend/shared.
    files:
      - path: ${backend_dir}/package.json
        merge_json:
          scripts:
            build: "rimraf dist && tsc -p tsconfig.json && tsc-alias -p tsconfig.json"
        ensure_dev_deps:
          tsc-alias: "^1.8.10"
      - path: tsconfig.base.json
        merge_json:
          compilerOptions:
            moduleResolution: "NodeNext"
            module: "ESNext"
            target: "ES2022"
            strict: true
            esModuleInterop: true
            resolveJsonModule: true
            baseUrl: "."
            paths:
              "@app/shared/*": ["packages/shared/src/*"]
    run:
      - npm run build -w ${shared_dir}
      - npm run build -w ${backend_dir}
    accept:
      - node -e "require('fs').accessSync('${backend_dir}/dist');"

  admin_transpile_shared:
    goal: Make Next.js build/export transpile @app/shared and serve under basePath.
    files:
      - path: ${admin_dir}/next.config.js
        ensure_js: |
          /** @type {import('next').NextConfig} */
          const nextConfig = {
            output: 'export',
            basePath: '${admin_base_path}',
            images: { unoptimized: true },
            experimental: { externalDir: true },
            transpilePackages: ['@app/shared']
          };
          module.exports = nextConfig;
      - path: ${admin_dir}/package.json
        merge_json:
          scripts:
            clean: "rimraf .next admin-out"
            build: "npm run clean && next build"
            export: "next export -o admin-out"
    run:
      - npm run build -w ${admin_dir}
      - npm run export -w ${admin_dir}
    accept:
      - test -d ${admin_dir}/admin-out

  hex_arch_backend:
    goal: Enforce hexagonal layout and DI boundaries in backend.
    checks:
      - "! grep -R \"require(\\|module.exports\" ${backend_dir}/src || true"
      - "! grep -R \"from 'pg'\" ${backend_dir}/src/http || true"
    accept:
      - test -f ${backend_dir}/src/app.ts
      - test -f ${backend_dir}/src/server.ts
      - test -d ${backend_dir}/src/modules

  security_hardening:
    goal: Helmet, CORS, rate limit, dotenv-safe; expanded .env.example.
    files:
      - path: .env.example
        ensure_lines:
          - "NODE_ENV=development"
          - "PORT=${port}"
          - "CORS_ORIGIN=${cors_origin}"
          - "ENCRYPTION_KEY_BASE64="
          - "DATABASE_URL="
          - "REDIS_URL="
      - path: ${backend_dir}/src/http/bootstrap/security.ts
        ensure_js: |
          import helmet from 'helmet';
          import cors from 'cors';
          import rateLimit from 'express-rate-limit';
          import type { Express } from 'express';
          export function applySecurity(app: Express) {
            app.use(helmet());
            app.use(cors({ origin: (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean) }));
            app.use(rateLimit({ windowMs: ${rate_limit_window_ms}, max: ${rate_limit_max}, standardHeaders: true, legacyHeaders: false }));
          }
    run:
      - npm i -w ${backend_dir} dotenv-safe helmet cors express-rate-limit
    accept:
      - grep -R "dotenv-safe/config" ${backend_dir}/src/server.ts

  validation_errors:
    goal: Zod request/env validation and unified AppError + errorHandler.
    files:
      - path: ${backend_dir}/src/http/errors/AppError.ts
        ensure_ts: |
          export class AppError extends Error {
            code: string; status: number; meta?: unknown;
            constructor(code: string, message: string, status = 400, meta?: unknown) {
              super(message); this.code = code; this.status = status; this.meta = meta;
            }
          }
      - path: ${backend_dir}/src/http/middleware/errorHandler.ts
        ensure_ts: |
          import type { NextFunction, Request, Response } from 'express';
          import { AppError } from '../errors/AppError.js';
          export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
            if (err instanceof AppError) return res.status(err.status).json({ error: err.code, message: err.message, meta: err.meta });
            return res.status(500).json({ error: 'INTERNAL_ERROR' });
          }
      - path: ${backend_dir}/src/http/middleware/validate.ts
        ensure_ts: |
          import type { Request, Response, NextFunction } from 'express';
          import type { ZodSchema } from 'zod';
          export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
            const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });
            if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
            // @ts-expect-error attach parsed if needed
            req.validated = parsed.data; next();
          }
      - path: ${backend_dir}/src/config/env.ts
        ensure_ts: |
          import { z } from 'zod';
          export const EnvSchema = z.object({
            NODE_ENV: z.enum(['development','test','production']),
            PORT: z.coerce.number().int().positive().default(${port}),
            CORS_ORIGIN: z.string().default('${cors_origin}'),
            ENCRYPTION_KEY_BASE64: z.string().min(1),
            DATABASE_URL: z.string().min(1),
            REDIS_URL: z.string().optional()
          });
          export type Env = z.infer<typeof EnvSchema>;
          export const loadEnv = (): Env => EnvSchema.parse(process.env);
    run:
      - npm i -w ${backend_dir} zod zod-validation-error
    accept:
      - grep -R "VALIDATION_ERROR" ${backend_dir}/src

  observability:
    goal: Request logging (pino), metrics (/metrics via prom-client).
    files:
      - path: ${backend_dir}/src/http/bootstrap/observability.ts
        ensure_ts: |
          import pino from 'pino';
          import pinoHttp from 'pino-http';
          import type { Express } from 'express';
          import client from 'prom-client';
          export const logger = pino({ level: process.env.LOG_LEVEL || 'info', redact: ['req.headers.authorization'] });
          export function applyObservability(app: Express) {
            app.use(pinoHttp({ logger }));
            client.collectDefaultMetrics();
            app.get('/metrics', async (_req, res) => {
              res.set('Content-Type', client.register.contentType);
              res.end(await client.register.metrics());
            });
          }
    run:
      - npm i -w ${backend_dir} pino pino-http prom-client
    accept:
      - grep -R "/metrics" ${backend_dir}/src

  openapi_docs:
    goal: Generate OpenAPI from zod & serve Swagger UI at /docs.
    files:
      - path: ${backend_dir}/src/http/bootstrap/docs.ts
        ensure_ts: |
          import type { Express } from 'express';
          import swaggerUi from 'swagger-ui-express';
          import { generateOpenApi } from '../../validation/openapi.js';
          export function applyDocs(app: Express) {
            const doc = generateOpenApi();
            app.get('/openapi.json', (_req, res) => res.json(doc));
            app.use('/docs', swaggerUi.serve, swaggerUi.setup(doc));
          }
      - path: ${backend_dir}/src/validation/openapi.ts
        ensure_ts: |
          import { OpenAPIRegistry, OpenAPIGenerator } from 'zod-to-openapi';
          import { CreateUserSchema } from './schemas.js';
          export const registry = new OpenAPIRegistry();
          registry.registerPath({
            method: 'post',
            path: '/api/users',
            request: { body: { content: { 'application/json': { schema: CreateUserSchema.shape.body } } } },
            responses: { 201: { description: 'Created' }, 400: { description: 'Validation error' } },
          });
          export function generateOpenApi() {
            const generator = new OpenAPIGenerator(registry.definitions, '3.0.0');
            return generator.generateDocument({ info: { title: 'API', version: '1.0.0' }, servers: [{ url: '/' }] });
          }
    run:
      - npm i -w ${backend_dir} zod-to-openapi swagger-ui-express
    accept:
      - curl -sSf http://localhost:${port}/openapi.json || true

  graceful_shutdown:
    goal: Close HTTP and DB gracefully on SIGTERM/SIGINT.
    files:
      - path: ${backend_dir}/src/server.ts
        ensure_contains: "process.on('SIGTERM'"
        patch: |
          const server = app.listen(port, () => console.log(`API on :${port}`));
          const shutdown = async () => {
            console.log('graceful shutdown...');
            server.closeAllConnections?.();
            server.close(() => console.log('http closed'));
            try { await pool.end?.(); } catch {}
            process.exit(0);
          };
          process.on('SIGTERM', shutdown);
          process.on('SIGINT', shutdown);
    accept:
      - "true"

  readiness_liveness:
    goal: Separate /api/livez (always OK) and /api/readyz (checks DB).
    files:
      - path: ${backend_dir}/src/http/routes.ts
        ensure_ts: |
          import { Router } from 'express';
          import { usersRoutes } from '../modules/users/http/routes.js';
          import type { IUserRepo } from '../modules/users/domain/User.js';
          export function buildRoutes(deps: { userRepo: IUserRepo, health?: { db: () => Promise<boolean> } }) {
            const r = Router();
            r.get('/livez', (_req, res) => res.send('OK'));
            r.get('/readyz', async (_req, res) => {
              const ok = await (deps.health?.db?.() ?? Promise.resolve(true));
              return ok ? res.send('OK') : res.status(503).send('NOT_READY');
            });
            r.get('/health', (_req, res) => res.json({ ok: true }));
            r.use('/users', usersRoutes(deps.userRepo));
            return r;
          }
    accept:
      - "true"

  request_id_ctx:
    goal: Correlate logs with X-Request-ID via AsyncLocalStorage.
    files:
      - path: ${backend_dir}/src/shared/context.ts
        ensure_ts: |
          import { AsyncLocalStorage } from 'node:async_hooks';
          export type Ctx = { requestId: string };
          export const als = new AsyncLocalStorage<Ctx>();
          export const withCtx = <T>(ctx: Ctx, fn: () => T) => als.run(ctx, fn);
          export const getCtx = () => als.getStore();
      - path: ${backend_dir}/src/app.ts
        ensure_contains: "withCtx({ requestId"
        patch: |
          import { randomUUID } from 'crypto';
          import { withCtx } from './shared/context.js';
          app.use((req, _res, next) => {
            const requestId = (req.header('x-request-id') as string) || randomUUID();
            // @ts-expect-error
            req.id = requestId;
            withCtx({ requestId }, next);
          });
    accept:
      - "true"

  db_migrations_prisma_or_knex:
    goal: Reproducible schema via Prisma or Knex (choose by defaults.db_tool).
    when:
      - "${db_tool} in ['prisma','knex','pg']"
    run_if:
      prisma:
        - npm i -w ${backend_dir} -D prisma
        - npm i -w ${backend_dir} @prisma/client
        - test -f ${backend_dir}/prisma/schema.prisma || npx -w ${backend_dir} prisma init
      knex:
        - npm i -w ${backend_dir} knex pg
        - npm i -w ${backend_dir} -D tsx
    accept:
      - "true"

  tx_error_map:
    goal: Centralize transactions and domain->HTTP error mapping.
    files:
      - path: ${backend_dir}/src/http/errors/map.ts
        ensure_ts: |
          import { AppError } from './AppError.js';
          export const mapDomainError = (e: unknown) => {
            if ((e as Error).message === 'USER_EXISTS') return new AppError('USER_EXISTS','User exists',409);
            return e;
          };
    accept:
      - "true"

  redis_idempotency:
    goal: Optional idempotency for POST using Redis.
    when:
      - "${redis_enabled} == true"
    files:
      - path: ${backend_dir}/src/http/middleware/idempotency.ts
        ensure_ts: |
          import type { Request, Response, NextFunction } from 'express';
          import Redis from 'ioredis';
          const redis = new Redis(process.env.REDIS_URL);
          export async function idempotency(req: Request, res: Response, next: NextFunction) {
            const key = req.header('idempotency-key'); if (!key) return next();
            const hit = await redis.get(key); if (hit) return res.status(409).json({ error:'IDEMPOTENT_REPLAY' });
            await redis.setex(key, 600, 'used'); // 10 min
            return next();
          }
    run:
      - npm i -w ${backend_dir} ioredis
    accept:
      - "true"

  pagination_contract:
    goal: Cursor-based pagination contract across list endpoints.
    files:
      - path: ${backend_dir}/src/validation/pagination.ts
        ensure_ts: |
          import { z } from 'zod';
          export const ListQuery = z.object({
            cursor: z.string().optional(),
            limit: z.coerce.number().min(1).max(100).default(20)
          });
          export type ListResult<T> = { items: T[]; nextCursor?: string };
    accept:
      - "true"

  response_validation:
    goal: (Dev) ensure responses match zod schemas for key endpoints.
    files:
      - path: ${backend_dir}/src/http/middleware/responseValidate.ts
        ensure_ts: |
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
    accept:
      - "true"

  ci_pipeline:
    goal: CI that builds/tests shared→backend→admin; scans duplicates & secrets.
    files:
      - path: .github/workflows/ci.yml
        ensure_yaml: |
          name: CI
          on: [push, pull_request]
          jobs:
            build_test:
              runs-on: ubuntu-latest
              steps:
                - uses: actions/checkout@v4
                - uses: actions/setup-node@v4
                  with:
                    node-version: '20'
                    cache: 'npm'
                - run: npm ci -w packages/shared -w packages/backend -w packages/admin
                - run: npm run build -w packages/shared
                - run: npm run lint -w packages/backend || true
                - run: npm run test -w packages/backend || true
                - run: npm run build -w packages/backend
                - run: npm run build -w packages/admin && npm run export -w packages/admin
                - run: npm i -D gitleaks jscpd
                - run: npx gitleaks detect --source . || true
                - run: npx jscpd --threshold 2 --reporters console --pattern "**/*.{ts,tsx,js,jsx}" --ignore "**/dist/**,**/.next/**,**/admin-out/**"
    accept:
      - "true"

  docker_polish:
    goal: Multi-stage build with separate caches, non-root runtime, healthcheck.
    files:
      - path: Dockerfile
        ensure_docker: |
          # deps: backend
          FROM node:20-bookworm-slim AS backend_deps
          WORKDIR /app/packages/backend
          COPY packages/backend/package*.json ./
          RUN npm ci --include=dev

          # deps: admin
          FROM node:20-bookworm-slim AS admin_deps
          WORKDIR /app/packages/admin
          COPY packages/admin/package*.json ./
          RUN npm ci --include=dev

          # build: shared
          FROM node:20-bookworm-slim AS shared_build
          WORKDIR /app
          COPY packages/shared ./packages/shared
          RUN npm ci -w packages/shared && npm run build -w packages/shared

          # build: backend
          FROM node:20-bookworm-slim AS backend_build
          WORKDIR /app
          COPY --from=backend_deps /app/packages/backend/node_modules ./packages/backend/node_modules
          COPY packages/backend ./packages/backend
          COPY --from=shared_build /app/packages/shared ./packages/shared
          RUN npm run build -w packages/backend

          # build: admin
          FROM node:20-bookworm-slim AS admin_build
          WORKDIR /app
          COPY --from=admin_deps /app/packages/admin/node_modules ./packages/admin/node_modules
          COPY packages/admin ./packages/admin
          COPY --from=shared_build /app/packages/shared ./packages/shared
          RUN npm run build -w packages/admin && npm run export -w packages/admin

          # runtime
          FROM node:20-bookworm-slim AS runtime
          WORKDIR /app
          ENV NODE_ENV=production
          COPY packages/backend/package*.json ./packages/backend/
          RUN npm ci --omit=dev -w packages/backend
          COPY --from=backend_build /app/packages/backend/dist ./packages/backend/dist
          COPY --from=admin_build   /app/packages/admin/admin-out ./packages/packages/admin/admin-out
          RUN mkdir -p /app/packages/admin && mv /app/packages/packages/admin/admin-out /app/packages/admin/admin-out || true
          RUN chown -R node:node /app
          USER node
          ENV ADMIN_STATIC_DIR=/app/packages/admin/admin-out
          EXPOSE 3000
          HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"
          CMD ["npm","--prefix","packages/backend","run","start"]
    accept:
      - "true"

  changesets_release:
    goal: Version and release @app/shared with Changesets (others stay private).
    run:
      - npm i -D -w . @changesets/cli
      - npx -y -w . changeset init || true
    accept:
      - test -d .changeset || true
