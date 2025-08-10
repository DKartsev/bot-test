version: 3
name: monorepo-backend-admin
summary: |
  Monorepo with three packages: packages/backend (Node/Express, TypeScript, ESM),
  packages/admin (Next.js, static export), and packages/shared (cross‑package utilities).
  Multi-stage Docker caches backend/admin deps separately and ships a slim, non-root runtime.
  This AGENTS file encodes the ideal structure goals and phased workflows.

workspaces:
  enabled: true

repo:
  packages:
    shared:
      path: packages/shared
      language: typescript
      build: "tsc -b packages/shared"
      lockfile: packages/shared/package-lock.json
    backend:
      path: packages/backend
      language: typescript
      moduleSystem: esm
      build: "npm run build -w packages/backend"
      start: "npm run start -w packages/backend"
      test: "npm run test -w packages/backend"
      lockfile: packages/backend/package-lock.json
    admin:
      path: packages/admin
      framework: nextjs
      moduleSystem: esm
      build: "npm run build -w packages/admin"
      export: "npm run export -w packages/admin"
      outDir: packages/admin/admin-out
      lockfile: packages/admin/package-lock.json

runtime:
  node: "20"
  npm: ">=10 <12"
  env:
    NODE_ENV: production
    ADMIN_STATIC_DIR: /app/packages/admin/admin-out
  user: node

policies:
  coding:
    - Single module system: ESM only ("type": "module"; TS module ESNext / NodeNext).
    - Strict TypeScript across packages; avoid `any` in critical paths.
    - Hexagonal architecture in backend (domain/app/infra/http separation; DI of adapters).
    - No synchronous fs calls in request paths; use fs/promises.
    - Shared utilities live in packages/shared; no duplication across backend/admin.
  security:
    - Secrets via `.env` + `dotenv-safe`; never commit secrets.
    - Helmet, CORS allowlist, rate limiting; request size limits.
    - Parameterized SQL or safe ORM APIs; forbid string-concatenated SQL.
    - AES‑256‑GCM for at‑rest sensitive values; rotate keys.
  testing:
    - Vitest with coverage gates; Supertest for HTTP; unit + integration layers.

workflows:
  - id: monorepo_setup
    name: Monorepo & workspaces
    description: Create packages/* layout and root workspaces config.
    steps:
      - run: mkdir -p packages/backend packages/admin packages/shared
      - run: |
          node -e "const fs=require('fs');const f='package.json';let p={private:true,workspaces:['packages/*'],engines:{node:'>=20 <23',npm:'>=10 <12'},scripts:{build:'npm run build -w packages/backend && npm run build -w packages/admin',lint:'npm run lint -w packages/backend && npm run lint -w packages/admin',test:'npm run test -w packages/backend'}};fs.existsSync(f)?console.log('root package.json exists'):fs.writeFileSync(f,JSON.stringify(p,null,2))"
      - run: echo "20" > .nvmrc
      - run: printf "engine-strict=true
fund=false
audit=false
" > .npmrc
      - run: printf "node_modules
**/node_modules
dist
.next
admin-out
.env
.env.*
" > .gitignore
      - run: printf "root = true
[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
indent_style = space
indent_size = 2
" > .editorconfig
    success_criteria:
      - cmd: node -e "console.log(require('./package.json').workspaces?.length>0?'ok':'fail')"

  - id: ts_project_refs
    name: TypeScript base config + project references
    steps:
      - run: |
          cat > tsconfig.base.json <<'JSON' 
          {"compilerOptions":{"target":"ES2022","module":"ESNext","moduleResolution":"NodeNext","strict":true,"noImplicitAny":true,"exactOptionalPropertyTypes":true,"noUncheckedIndexedAccess":true,"resolveJsonModule":true,"esModuleInterop":true,"skipLibCheck":true,"baseUrl":".","paths":{"@shared/*":["packages/shared/src/*"]}}}
          JSON
      - run: |
          mkdir -p packages/shared/src && cat > packages/shared/tsconfig.json <<'JSON'
          {"extends":"../../tsconfig.base.json","compilerOptions":{"outDir":"dist"},"include":["src"],"references":[]}
          JSON
      - run: |
          mkdir -p packages/backend/src && cat > packages/backend/tsconfig.json <<'JSON'
          {"extends":"../../tsconfig.base.json","compilerOptions":{"outDir":"dist","rootDir":"src"},"include":["src"],"references":[{"path":"../shared"}]}
          JSON
      - run: |
          mkdir -p packages/admin && cat > packages/admin/tsconfig.json <<'JSON'
          {"extends":"../../tsconfig.base.json"}
          JSON
    success_criteria:
      - cmd: npx -y typescript -b packages/shared packages/backend

  - id: enforce_esm
    name: Enforce ESM only
    steps:
      - run: node -e "['packages/backend','packages/admin'].forEach(p=>{const f=p+'/package.json';const j=require('fs').existsSync(f)?JSON.parse(require('fs').readFileSync(f,'utf8')):{};j.type='module';require('fs').writeFileSync(f,JSON.stringify(j,null,2));})"
      - run: grep -R "require(\|module.exports" -n packages/backend || true
    success_criteria:
      - cmd: test -z "$(grep -R "require(\|module.exports" -n packages/backend || true)" 

  - id: shared_dedupe
    name: Deduplicate to packages/shared
    steps:
      - run: npm i -D jscpd
      - run: npx jscpd --threshold 2 --reporters console --pattern "**/*.{ts,tsx,js,jsx}" --ignore "**/dist/**,**/.next/**,**/admin-out/**"
      - note: Move repeated helpers to packages/shared/src and refactor imports to @shared/*.
    success_criteria:
      - cmd: npx jscpd --threshold 2 --silent --pattern "**/*.{ts,tsx,js,jsx}" --ignore "**/dist/**,**/.next/**,**/admin-out/**" || true

  - id: hex_arch_backend
    name: Backend hexagonal structure
    steps:
      - note: Restructure packages/backend/src into app.ts, server.ts, config/, http/, modules/*/{domain,app,infra,http}, shared/.
      - note: Services depend on domain interfaces; adapters live in infra; controllers call services only.
    success_criteria:
      - code_check:
          path: packages/backend/src
          must_not_include: "controllers importing db client directly"

  - id: error_model
    name: Unified AppError + global error handler
    steps:
      - code_gen:
          path: packages/backend/src/http/errors/AppError.ts
          template: |
            export class AppError extends Error { code: string; status: number; meta?: unknown; constructor(code: string, message: string, status = 400, meta?: unknown){ super(message); this.code=code; this.status=status; this.meta=meta; } }
      - code_gen:
          path: packages/backend/src/http/middleware/errorHandler.ts
          template: |
            import type { NextFunction, Request, Response } from 'express';
            import { AppError } from '../errors/AppError.js';
            export function errorHandler(err: unknown,_req:Request,res:Response,_next:NextFunction){
              if (err instanceof AppError) return res.status(err.status).json({ error: err.code, message: err.message, meta: err.meta });
              return res.status(500).json({ error: 'INTERNAL_ERROR' });
            }
    success_criteria:
      - note: Throwing AppError in a handler returns structured JSON and correct status.

  - id: validation_env
    name: Zod validation + env schema
    steps:
      - run: npm -w packages/backend i zod zod-validation-error
      - code_gen:
          path: packages/backend/src/http/middleware/validate.ts
          template: |
            import type { Request, Response, NextFunction } from 'express';
            import type { ZodSchema } from 'zod';
            export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
              const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });
              if (!parsed.success) return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
              // @ts-expect-error attach parsed if needed
              req.validated = parsed.data; next(); };
      - code_gen:
          path: packages/backend/src/config/env.ts
          template: |
            import { z } from 'zod';
            export const EnvSchema = z.object({ NODE_ENV: z.enum(['development','test','production']), PORT: z.coerce.number().int().positive().default(3000), CORS_ORIGIN: z.string().default('http://localhost:3000'), ENCRYPTION_KEY_BASE64: z.string().min(1), DATABASE_URL: z.string().min(1) });
            export type Env = z.infer<typeof EnvSchema>;
            export const loadEnv = (): Env => EnvSchema.parse(process.env);
    success_criteria:
      - note: Invalid env halts startup with descriptive error; invalid input returns 400 VALIDATION_ERROR.

  - id: security_hardening
    name: Security hardening (dotenv-safe, Helmet, CORS, rate limit)
    steps:
      - run: npm -w packages/backend i dotenv-safe helmet cors express-rate-limit
      - note: Add `import 'dotenv-safe/config'` at the very top of packages/backend/src/server.ts.
      - code_gen:
          path: packages/backend/src/http/bootstrap/security.ts
          template: |
            import helmet from 'helmet';
            import cors from 'cors';
            import rateLimit from 'express-rate-limit';
            import type { Express } from 'express';
            export function applySecurity(app: Express){
              app.use(helmet());
              app.use(cors({ origin: (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean) }));
              app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));
            }
      - file_write:
          path: .env.example
          contents: |
            NODE_ENV=development
            PORT=3000
            CORS_ORIGIN=http://localhost:3000
            ENCRYPTION_KEY_BASE64=
            DATABASE_URL=
    success_criteria:
      - note: Helmet headers observed; CORS restricted; rate limiting enforced.

  - id: sql_safety
    name: SQL injection prevention
    steps:
      - note: Replace concatenated SQL with parameterized queries (pg: $1,$2; Prisma: $queryRaw tagged template).
      - run: grep -R "\${.*}" -n packages/backend/src || true
    success_criteria:
      - cmd: test -z "$(grep -R "SELECT .*\${" -n packages/backend/src || true)"

  - id: crypto_shared
    name: AES-256-GCM in shared
    steps:
      - code_gen:
          path: packages/shared/src/crypto/encryption.ts
          template: |
            import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
            const ALGO='aes-256-gcm';
            const key = Buffer.from(process.env.ENCRYPTION_KEY_BASE64 || '', 'base64');
            export function encrypt(plaintext:string){ const iv=randomBytes(12); const c=createCipheriv(ALGO,key,iv); const enc=Buffer.concat([c.update(plaintext,'utf8'),c.final()]); const tag=c.getAuthTag(); return Buffer.concat([iv,tag,enc]).toString('base64'); }
            export function decrypt(b64:string){ const buf=Buffer.from(b64,'base64'); const iv=buf.subarray(0,12); const tag=buf.subarray(12,28); const data=buf.subarray(28); const d=createDecipheriv(ALGO,key,iv); d.setAuthTag(tag); const dec=Buffer.concat([d.update(data),d.final()]); return dec.toString('utf8'); }
    success_criteria:
      - note: Round-trip tests pass; changing key fails decryption.

  - id: admin_static_export
    name: Next.js static export
    steps:
      - code_gen:
          path: packages/admin/next.config.js
          template: |
            /** @type {import('next').NextConfig} */
            const nextConfig = { output: 'export', images: { unoptimized: true } };
            module.exports = nextConfig;
      - run: npm run build -w packages/admin && npm run export -w packages/admin
    success_criteria:
      - file_exists: packages/admin/admin-out/index.html

  - id: tests_coverage
    name: Vitest + Supertest with coverage gates
    steps:
      - run: npm -w packages/backend i -D vitest @vitest/coverage-v8 supertest ts-node
      - file_write:
          path: packages/backend/vitest.config.ts
          contents: |
            import { defineConfig } from 'vitest/config';
            export default defineConfig({ test: { coverage: { provider: 'v8', statements: 85, branches: 80, functions: 85, lines: 85 } } });
      - run: npm run test -w packages/backend -- --run
    success_criteria:
      - note: Coverage meets thresholds.

  - id: lint_prettier
    name: Lint/format & boundaries
    steps:
      - run: npm -w packages/backend i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-import eslint-config-prettier prettier
      - run: npm -w packages/admin   i -D eslint-config-next prettier
      - file_write:
          path: packages/backend/.eslintrc.cjs
          contents: |
            module.exports = { parser:'@typescript-eslint/parser', plugins:['@typescript-eslint','import'], extends:['eslint:recommended','plugin:@typescript-eslint/recommended','plugin:import/recommended','prettier'], rules:{'import/no-cycle':'error','node/no-sync':'error'}, settings:{'import/resolver':{typescript:{project:'./tsconfig.json'}}} };
    success_criteria:
      - cmd: npm run lint -w packages/backend || true

  - id: ci_pipeline
    name: CI pipeline
    steps:
      - file_write:
          path: .github/workflows/ci.yml
          contents: |
            name: CI
            on: [push, pull_request]
            jobs:
              build_test:
                runs-on: ubuntu-latest
                steps:
                  - uses: actions/checkout@v4
                  - uses: actions/setup-node@v4
                    with: { node-version: '20', cache: 'npm' }
                  - run: npm ci -w packages/shared -w packages/backend -w packages/admin
                  - run: npm run lint -w packages/backend
                  - run: npm run test -w packages/backend
                  - run: npm run build -w packages/backend
                  - run: npm run build -w packages/admin && npm run export -w packages/admin
                  - run: npm audit --omit=dev || true
    success_criteria:
      - note: CI green only if lint, tests, builds succeed.

  - id: docker_multistage
    name: Multi-stage Docker (separate caches, slim, non-root)
    steps:
      - file_write:
          path: Dockerfile
          contents: |
            FROM node:20-bookworm-slim AS backend_deps
            WORKDIR /app/packages/backend
            COPY packages/backend/package*.json ./
            RUN npm ci --include=dev
            
            FROM node:20-bookworm-slim AS admin_deps
            WORKDIR /app/packages/admin
            COPY packages/admin/package*.json ./
            RUN npm ci --include=dev
            
            FROM node:20-bookworm-slim AS backend_build
            WORKDIR /app
            COPY --from=backend_deps /app/packages/backend/node_modules ./packages/backend/node_modules
            COPY packages/shared ./packages/shared
            COPY packages/backend ./packages/backend
            RUN npm run build -w packages/backend
            
            FROM node:20-bookworm-slim AS admin_build
            WORKDIR /app
            COPY --from=admin_deps /app/packages/admin/node_modules ./packages/admin/node_modules
            COPY packages/shared ./packages/shared
            COPY packages/admin ./packages/admin
            RUN npm run build -w packages/admin && npm run export -w packages/admin
            
            FROM node:20-bookworm-slim AS runtime
            WORKDIR /app
            ENV NODE_ENV=production
            USER node
            COPY packages/backend/package*.json ./packages/backend/
            RUN npm ci --omit=dev -w packages/backend
            COPY --from=backend_build /app/packages/backend/dist ./packages/backend/dist
            COPY --from=admin_build   /app/packages/admin/admin-out ./packages/admin/admin-out
            ENV ADMIN_STATIC_DIR=/app/packages/admin/admin-out
            EXPOSE 3000
            CMD ["npm","--prefix","packages/backend","run","start"]
      - run: docker build --file Dockerfile --target runtime -t app:latest .
    success_criteria:
      - cmd: docker image inspect app:latest

  - id: lockfile_sync
    name: Sync lockfiles per package
    steps:
      - run: rm -rf packages/backend/node_modules packages/backend/package-lock.json
      - run: rm -rf packages/admin/node_modules packages/admin/package-lock.json
      - run: npm --prefix packages/backend install --package-lock-only
      - run: npm --prefix packages/admin   install --package-lock-only
      - run: npm --prefix packages/backend ci && npm --prefix packages/admin ci
    success_criteria:
      - file_exists: packages/backend/package-lock.json
      - file_exists: packages/admin/package-lock.json

  - id: runtime_serve_admin
    name: Serve admin static from backend
    steps:
      - note: In Express app, mount express.static(ADMIN_STATIC_DIR) at /admin.
    success_criteria:
      - http: { url: "http://localhost:3000/admin", status: 200 }

  - id: migration_rollout
    name: Migration guide & PR strategy
    steps:
      - file_write:
          path: MIGRATION_GUIDE.md
          contents: |
            # Phases: structure → ESM → strict TS → security → shared → tests → CI → Docker → cleanups
            - Create small PRs per phase; CI must pass each PR before merging.
    success_criteria:
      - file_exists: MIGRATION_GUIDE.md

agents:
  - id: StructureAgent
    role: Monorepo Structure & Workspaces
    actions: [ { workflow: monorepo_setup }, { workflow: ts_project_refs }, { workflow: enforce_esm } ]

  - id: SharedAgent
    role: Shared Utilities & Deduplication
    actions: [ { workflow: shared_dedupe }, { workflow: crypto_shared } ]

  - id: ArchAgent
    role: Backend Architecture (Hexagonal)
    actions: [ { workflow: hex_arch_backend } ]

  - id: ErrorAgent
    role: Error Handling
    actions: [ { workflow: error_model } ]

  - id: ValidationAgent
    role: Validation & Env Schema
    actions: [ { workflow: validation_env } ]

  - id: SecurityAgent
    role: Security Hardening
    actions: [ { workflow: security_hardening }, { workflow: sql_safety } ]

  - id: AdminAgent
    role: Next.js Admin Export
    actions: [ { workflow: admin_static_export } ]

  - id: TestAgent
    role: Testing & Coverage
    actions: [ { workflow: tests_coverage } ]

  - id: LintAgent
    role: Lint/Format
    actions: [ { workflow: lint_prettier } ]

  - id: CIAgent
    role: CI/CD
    actions: [ { workflow: ci_pipeline }, { workflow: lockfile_sync } ]

  - id: DockerAgent
    role: Docker Build & Runtime
    actions: [ { workflow: docker_multistage }, { workflow: runtime_serve_admin } ]
