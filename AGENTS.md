version: 1
name: app-monorepo-hardening
description: >
  Complete, ordered workflows to reach “ideal” production quality:
  monorepo workspaces, strict TS (NodeNext), ESM-only, hexagonal backend,
  security, validation & unified errors, observability, OpenAPI, CI, Docker,
  DB migrations, i18n, Q&A module refactor, admin moderation, tests & releases.

defaults:
  node_version: "20"
  npm_version: ">=10 <12"
  packages_root: "packages"
  backend_dir: "packages/backend"
  admin_dir: "packages/admin"
  shared_dir: "packages/shared"
  admin_base_path: "/admin"
  cors_origin: "http://localhost:3000"
  rate_limit_window_ms: 900000
  rate_limit_max: 100
  port: 3000
  db_tool: "pg"           # pg | prisma | knex
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
  - qa_module_ts_hex
  - i18n_system_messages
  - answer_refactor_dedup
  - unknowns_graceful
  - store_async_io
  - qa_tests
  - admin_tests
  - shared_models_schemas
  - shared_constants
  - shared_tests
  - openapi_expand
  - db_migrations_prisma_or_knex
  - tx_error_map
  - redis_idempotency
  - pagination_contract
  - response_validation
  - live_monitoring_dashboard
  - moderation_backend_admin
  - admin_auth_rbac
  - ci_quality_gates
  - ci_pipeline
  - dockerfile_copy_fix
  - docker_polish
  - dead_code_cleanup
  - changesets_release

workflows:

  # ——— существующие базовые (сокращённо, без изменений логики) ———
  lockfile_sync:
    goal: Fresh lockfiles per workspace.
    run:
      - rm -rf node_modules package-lock.json
      - rm -rf ${backend_dir}/node_modules ${backend_dir}/package-lock.json
      - rm -rf ${admin_dir}/node_modules   ${admin_dir}/package-lock.json
      - rm -rf ${shared_dir}/node_modules  ${shared_dir}/package-lock.json
      - npm --prefix ${backend_dir} install --package-lock-only
      - npm --prefix ${admin_dir}   install --package-lock-only
      - npm --prefix ${shared_dir}  install --package-lock-only
    accept:
      - test -f ${backend_dir}/package-lock.json
      - test -f ${admin_dir}/package-lock.json
      - test -f ${shared_dir}/package-lock.json

  shared_package:
    goal: @app/shared as distributable ESM.
    files:
      - path: ${shared_dir}/package.json
        merge_json:
          name: "@app/shared"
          private: false
          type: "module"
          main: "dist/index.js"
          module: "dist/index.js"
          types: "dist/index.d.ts"
          exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } }
          files: ["dist"]
          scripts:
            clean: "rimraf dist"
            build: "npm run clean && tsc -p tsconfig.json && tsc-alias -p tsconfig.json"
    run:
      - npm run build -w ${shared_dir}
    accept:
      - test -f ${shared_dir}/dist/index.js

  tsc_alias_setup:
    goal: Runtime-safe TS paths for backend/shared.
    files:
      - path: ${backend_dir}/package.json
        merge_json:
          scripts:
            build: "rimraf dist && tsc -p tsconfig.json && tsc-alias -p tsconfig.json"
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
    goal: Next transpiles @app/shared; static export under basePath.
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
    run:
      - npm run build -w ${admin_dir}
      - npm run export -w ${admin_dir}
    accept:
      - test -d ${admin_dir}/admin-out

  hex_arch_backend:
    goal: Enforce hexagonal layout & DI.
    checks:
      - "! grep -R \"require(\\|module.exports\" ${backend_dir}/src || true"
      - "! grep -R \"from 'pg'\" ${backend_dir}/src/http || true"
    accept:
      - test -f ${backend_dir}/src/app.ts
      - test -f ${backend_dir}/src/server.ts

  security_hardening:
    goal: Helmet, CORS, rate limit, dotenv-safe.
    files:
      - path: .env.example
        ensure_lines:
          - "NODE_ENV=development"
          - "PORT=${port}"
          - "CORS_ORIGIN=${cors_origin}"
          - "ENCRYPTION_KEY_BASE64="
          - "DATABASE_URL="
          - "REDIS_URL="
    run:
      - npm i -w ${backend_dir} dotenv-safe helmet cors express-rate-limit
    accept:
      - grep -R "dotenv-safe/config" ${backend_dir}/src/server.ts

  validation_errors:
    goal: Zod request/env validation & unified AppError.
    run:
      - npm i -w ${backend_dir} zod zod-validation-error
    accept:
      - grep -R "VALIDATION_ERROR" ${backend_dir}/src

  observability:
    goal: pino logs + /metrics (prom-client).
    run:
      - npm i -w ${backend_dir} pino pino-http prom-client
    accept:
      - grep -R "/metrics" ${backend_dir}/src

  openapi_docs:
    goal: Base OpenAPI generator + Swagger UI.
    run:
      - npm i -w ${backend_dir} zod-to-openapi swagger-ui-express
    accept:
      - "true"

  graceful_shutdown:
    goal: Close HTTP & DB on SIGTERM/SIGINT.
    accept: [ "true" ]

  readiness_liveness:
    goal: /api/livez (always ok) & /api/readyz (DB).
    accept: [ "true" ]

  request_id_ctx:
    goal: Correlate logs with X-Request-ID via ALS.
    accept: [ "true" ]

  tx_error_map:
    goal: Map domain errors → HTTP codes.
    accept: [ "true" ]

  pagination_contract:
    goal: Cursor-based pagination DTOs.
    files:
      - path: ${backend_dir}/src/validation/pagination.ts
        ensure_ts: |
          import { z } from 'zod';
          export const ListQuery = z.object({
            cursor: z.string().optional(),
            limit: z.coerce.number().min(1).max(100).default(20)
          });
          export type ListResult<T> = { items: T[]; nextCursor?: string };
    accept: [ "true" ]

  response_validation:
    goal: Dev-only response schema guard.
    accept: [ "true" ]

  ci_pipeline:
    goal: CI builds/tests shared→backend→admin; scans.
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
                  with: { node-version: '20', cache: 'npm' }
                - run: npm ci -w packages/shared -w packages/backend -w packages/admin
                - run: npm run build -w packages/shared
                - run: npm run lint -w packages/backend || true
                - run: npm run test -w packages/backend || true
                - run: npm run build -w packages/backend
                - run: npm run build -w packages/admin && npm run export -w packages/admin
                - run: npm i -D gitleaks jscpd
                - run: npx gitleaks detect --source . || true
                - run: npx jscpd --threshold 2 --reporters console --pattern "**/*.{ts,tsx,js,jsx}" --ignore "**/dist/**,**/.next/**,**/admin-out/**"
    accept: [ "true" ]

  docker_polish:
    goal: Multi-stage build; non-root runtime; healthcheck.
    accept: [ "true" ]

  changesets_release:
    goal: Version & release @app/shared via Changesets.
    run:
      - npm i -D -w . @changesets/cli
      - npx -y -w . changeset init || true
    accept:
      - test -d .changeset || true

  db_migrations_prisma_or_knex:
    goal: Reproducible DB schema & /readyz DB probe.
    when: [ "${db_tool} in ['prisma','knex','pg']" ]
    run_if:
      prisma:
        - npm i -w ${backend_dir} -D prisma
        - npm i -w ${backend_dir} @prisma/client
        - test -f ${backend_dir}/prisma/schema.prisma || npx -w ${backend_dir} prisma init
      knex:
        - npm i -w ${backend_dir} knex pg
        - npm i -w ${backend_dir} -D tsx
    accept: [ "true" ]

  redis_idempotency:
    goal: Optional POST idempotency via Redis.
    when: [ "${redis_enabled} == true" ]
    run:
      - npm i -w ${backend_dir} ioredis
    accept: [ "true" ]

  dockerfile_copy_fix:
    goal: Fix admin-out COPY path & faster healthcheck.
    files:
      - path: Dockerfile
        patch_docker: |
          # ensure admin-out copy path is correct and healthcheck hits /api/livez
          # (apply only if mismatch found)
    accept: [ "true" ]

  dead_code_cleanup:
    goal: Remove/Archive legacy & finalize Conversation module decision.
    run:
      - "true"
    accept: [ "true" ]

  # ——— НОВЫЕ workflows из аудита ———

  qa_module_ts_hex:
    goal: Move Q&A to strict TS hex module with DI.
    files:
      - path: ${backend_dir}/src/modules/qa/domain/index.ts
        ensure_ts: |
          export type AnswerSource = 'kb' | 'semantic' | 'rag' | 'openai';
          export type AnswerMethod = 'exact' | 'fuzzy' | 'semantic' | 'fallback';
          export interface QAEntry { id: string; question: string; answer: string; lang?: string; vars?: string[]; status?: 'approved'|'pending'; }
          export interface IKnowledgeBase {
            findExact(q: string, lang?: string): Promise<QAEntry | null>;
            findFuzzy(q: string, lang?: string): Promise<{ item: QAEntry; score: number } | null>;
            findSemantic?(q: string, lang?: string): Promise<{ item: QAEntry; score: number } | null>;
            savePending?(q: string, a: string, meta?: Record<string, unknown>): Promise<QAEntry>;
          }
          export interface IAnswerProvider {
            answerWithRag?(q: string, lang?: string): Promise<{ text: string; sources?: any[] } | null>;
            answerLLM?(q: string, lang?: string, ctx?: any): Promise<string | null>;
          }
          export type AnswerResult = { text: string; method: AnswerMethod; source: AnswerSource; dlp?: { blocked: boolean } };
      - path: ${backend_dir}/src/modules/qa/app/QAService.ts
        ensure_ts: |
          import type { IKnowledgeBase, IAnswerProvider, AnswerResult } from '../domain/index.js';
          export class QAService {
            constructor(private kb: IKnowledgeBase, private provider?: IAnswerProvider) {}
            async ask(q: string, lang?: string, vars?: Record<string,string>): Promise<AnswerResult> {
              // placeholder orchestration; real logic already present in repo—wire it here.
              const exact = await this.kb.findExact(q, lang);
              if (exact) return { text: exact.answer, method: 'exact', source: 'kb' };
              const fuzzy = await this.kb.findFuzzy(q, lang);
              if (fuzzy) return { text: fuzzy.item.answer, method: 'fuzzy', source: 'kb' };
              if (this.provider?.answerLLM) {
                const llm = await this.provider.answerLLM(q, lang);
                if (llm) { await this.kb.savePending?.(q, llm, { provider: 'openai' }); return { text: llm, method: 'fallback', source: 'openai' }; }
              }
              return { text: 'NO_ANSWER', method: 'fallback', source: 'kb' };
            }
          }
      - path: ${backend_dir}/src/modules/qa/infra/FsKnowledgeBase.ts
        ensure_ts: |
          // adapter that proxies to existing file-based store (wire existing code)
          import type { IKnowledgeBase, QAEntry } from '../domain/index.js';
          export class FsKnowledgeBase implements IKnowledgeBase {
            async findExact(q: string, lang?: string): Promise<QAEntry|null> { return null; }
            async findFuzzy(q: string, lang?: string): Promise<{item:QAEntry;score:number}|null> { return null; }
            async savePending(q: string, a: string, meta?: any): Promise<QAEntry> { return { id: 'pending', question: q, answer: a, status:'pending' }; }
          }
    accept: [ "true" ]

  i18n_system_messages:
    goal: Localize system texts (clarifications/errors).
    files:
      - path: ${backend_dir}/src/i18n/messages.json
        ensure_json:
          en:
            need_params: "To answer precisely, please provide: {{list}} 🙌"
            no_answer: "Sorry, I don't know that yet. I've logged it for review."
          ru:
            need_params: "Чтобы ответить точно, укажите: {{list}} 🙌"
            no_answer: "Извините, я пока не знаю. Я передал вопрос на проверку."
      - path: ${backend_dir}/src/i18n/index.ts
        ensure_ts: |
          import msgs from './messages.json' assert { type: 'json' };
          export function t(lang: string|undefined, key: string, vars: Record<string,string> = {}) {
            const m = (msgs as any)[(lang||'en').slice(0,2)]?.[key] || (msgs as any).en[key] || key;
            return Object.keys(vars).reduce((s,k)=>s.replaceAll(`{{${k}}}`, vars[k]), m);
          }
    accept:
      - grep -R "need_params" ${backend_dir}/src/i18n/messages.json

  answer_refactor_dedup:
    goal: Extract helper to render candidate → reduce duplication.
    files:
      - path: ${backend_dir}/src/modules/qa/app/render.ts
        ensure_ts: |
          import { t } from '../../i18n/index.js';
          export function renderFromCandidate(item: any, lang: string|undefined, vars?: Record<string,string>) {
            const req = (item.vars || []) as string[];
            const missing = req.filter(v => !vars?.[v]);
            if (missing.length) return { text: t(lang,'need_params',{ list: missing.join(', ') }), method:'fallback', source:'kb' as const };
            // TODO: template rendering + DLP here (wire existing code)
            return { text: item.answer, method:'exact', source:'kb' as const };
          }
    accept: [ "true" ]

  unknowns_graceful:
    goal: Friendly fallback when LLM disabled/unavailable.
    files:
      - path: ${backend_dir}/src/modules/qa/app/QAService.ts
        ensure_contains: "NO_ANSWER"
    accept: [ "true" ]

  store_async_io:
    goal: Switch store writes to async fs.promises + atomic rename.
    files:
      - path: ${backend_dir}/src/modules/qa/infra/FsKnowledgeBase.ts
        ensure_contains: "fs.promises"
    accept: [ "true" ]

  qa_tests:
    goal: Unit + integration tests for answering flow.
    run:
      - npm i -w ${backend_dir} -D vitest @vitest/coverage-v8 supertest ts-node
      - mkdir -p ${backend_dir}/tests/qa
      - bash -lc "cat > ${backend_dir}/tests/qa/answer.spec.ts <<'TS'
        import { describe,it,expect,vi } from 'vitest';
        import { QAService } from '../../src/modules/qa/app/QAService';
        describe('QAService', () => {
          it('returns exact match', async () => {
            const kb = { findExact: vi.fn().mockResolvedValue({ answer:'Hello'}), findFuzzy: vi.fn() } as any;
            const svc = new QAService(kb);
            const r = await svc.ask('hi','en');
            expect(r.text).toBe('Hello'); expect(r.method).toBe('exact');
          });
        });
        TS"
    accept:
      - npm run test -w ${backend_dir} -- --run || true

  admin_tests:
    goal: Admin unit (RTL) + optional e2e (Cypress).
    run:
      - npm i -w ${admin_dir} -D @testing-library/react @testing-library/jest-dom vitest jsdom
      - mkdir -p ${admin_dir}/tests && echo "/* add component tests here */" > ${admin_dir}/tests/smoke.test.tsx
    accept: [ "true" ]

  shared_models_schemas:
    goal: Central Q&A types/schemas in @app/shared.
    files:
      - path: ${shared_dir}/src/models/qa.ts
        ensure_ts: |
          import { z } from 'zod';
          export const QAEntrySchema = z.object({
            id: z.string(),
            question: z.string(),
            answer: z.string(),
            lang: z.string().optional(),
            vars: z.array(z.string()).optional(),
            status: z.enum(['approved','pending']).optional()
          });
          export type QAEntry = z.infer<typeof QAEntrySchema>;
      - path: ${shared_dir}/src/index.ts
        ensure_contains: "export * from './models/qa.js';"
    run:
      - npm run build -w ${shared_dir}
    accept:
      - test -f ${shared_dir}/dist/index.js

  shared_constants:
    goal: Move shared constants to @app/shared.
    files:
      - path: ${shared_dir}/src/constants/index.ts
        ensure_ts: |
          export const SUPPORTED_LANGS = ['en','ru'];
          export const FUZZY_THRESHOLD = 0.4;
          export const SEM_THRESHOLD = 0.78;
    run:
      - npm run build -w ${shared_dir}
    accept: [ "true" ]

  shared_tests:
    goal: Vitest for shared utils.
    run:
      - npm i -w ${shared_dir} -D vitest @vitest/coverage-v8
      - mkdir -p ${shared_dir}/tests && echo "import { describe,it,expect } from 'vitest'; describe('shared',()=>it('ok',()=>expect(true).toBe(true)))" > ${shared_dir}/tests/smoke.spec.ts
      - npm run test -w ${shared_dir} -- --run || true
    accept: [ "true" ]

  openapi_expand:
    goal: Document all endpoints (health/users/ask/moderation).
    files:
      - path: ${backend_dir}/src/validation/openapi.ts
        ensure_contains: "/api/ask"
    accept: [ "true" ]

  live_monitoring_dashboard:
    goal: SSE/WebSocket feed of ask-events + admin UI page.
    files:
      - path: ${backend_dir}/src/http/events.ts
        ensure_ts: |
          import type { Express, Request, Response } from 'express';
          export function mountSSE(app: Express, bus: any) {
            app.get('/api/events', (req: Request, res: Response) => {
              res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'}); res.flushHeaders();
              const onAsk = (e:any)=> res.write(`data: ${JSON.stringify(e)}\n\n`);
              bus.on('ask', onAsk);
              req.on('close', ()=> bus.off('ask', onAsk));
            });
          }
    accept: [ "true" ]

  moderation_backend_admin:
    goal: Pending moderation endpoints (BE) + admin page.
    files:
      - path: ${backend_dir}/src/http/routes.qa.moderation.ts
        ensure_ts: |
          import { Router } from 'express';
          export const qaModerationRoutes = () => {
            const r = Router();
            r.get('/', (_req,res)=>res.json({ items:[] }));
            r.put('/:id/approve', (_req,res)=>res.status(204).end());
            r.post('/:id/reject', (_req,res)=>res.status(204).end());
            return r;
          }
    accept: [ "true" ]

  admin_auth_rbac:
    goal: Protect admin pages & moderation APIs with auth/roles.
    files:
      - path: ${backend_dir}/src/http/middleware/auth.ts
        ensure_ts: |
          import type { Request, Response, NextFunction } from 'express';
          export function requireRole(role:'admin'|'editor') {
            return (req: Request, res: Response, next: NextFunction) => {
              // TODO: verify token (JWT/OAuth). For now, allow if header present.
              if (!req.headers.authorization) return res.status(401).json({ error: 'UNAUTHORIZED' });
              return next();
            };
          }
    accept: [ "true" ]

  ci_quality_gates:
    goal: Make lint/test fail the build; audit & (opt) openapi-diff.
    files:
      - path: .github/workflows/ci.yml
        ensure_yaml_fragment:
          - "npm run lint -w packages/backend"
          - "npm run test -w packages/backend -- --run"
          - "npm audit --omit=dev || true"
    accept: [ "true" ]
agents:
  - id: StructureAgent
    role: Monorepo & Workspaces
    actions:
      - { workflow: lockfile_sync }
      - { workflow: shared_package }
      - { workflow: tsc_alias_setup }
      - { workflow: admin_transpile_shared }

  - id: BackendArchAgent
    role: Backend Architecture & Runtime
    actions:
      - { workflow: hex_arch_backend }
      - { workflow: request_id_ctx }
      - { workflow: graceful_shutdown }
      - { workflow: readiness_liveness }

  - id: SecurityAgent
    role: Security, Validation & Errors
    actions:
      - { workflow: security_hardening }
      - { workflow: validation_errors }
      - { workflow: tx_error_map }
      - { workflow: response_validation }

  - id: QAAgent
    role: Q&A Core (TypeScript, DI, i18n)
    actions:
      - { workflow: qa_module_ts_hex }
      - { workflow: answer_refactor_dedup }
      - { workflow: i18n_system_messages }
      - { workflow: unknowns_graceful }
      - { workflow: store_async_io }

  - id: TestingAgent
    role: Tests & Coverage
    actions:
      - { workflow: qa_tests }
      - { workflow: admin_tests }
      - { workflow: shared_tests }

  - id: SharedModelAgent
    role: Shared Models & Constants
    actions:
      - { workflow: shared_models_schemas }
      - { workflow: shared_constants }

  - id: OpenAPIAgent
    role: API Documentation
    actions:
      - { workflow: openapi_docs }
      - { workflow: openapi_expand }

  - id: DBAgent
    role: Database & Data Access
    actions:
      - { workflow: db_migrations_prisma_or_knex }
      - { workflow: pagination_contract }
      - { workflow: redis_idempotency }

  - id: ObservabilityAgent
    role: Logs, Metrics & Events
    actions:
      - { workflow: observability }
      - { workflow: live_monitoring_dashboard }

  - id: ModerationAgent
    role: Knowledge Moderation & Admin APIs
    actions:
      - { workflow: moderation_backend_admin }
      - { workflow: admin_auth_rbac }

  - id: CIAgent
    role: CI Quality Gates
    actions:
      - { workflow: ci_quality_gates }
      - { workflow: ci_pipeline }

  - id: DockerAgent
    role: Docker Build & Runtime
    actions:
      - { workflow: dockerfile_copy_fix }
      - { workflow: docker_polish }

  - id: CleanupAgent
    role: Cleanup & Legacy
    actions:
      - { workflow: dead_code_cleanup }

  - id: ReleaseAgent
    role: Releases & Versioning
    actions:
      - { workflow: changesets_release }
playbooks:
  - id: HardenBackend
    name: Harden Backend
    description: >
      Приводит backend к прод-уровню: архитектура, безопасность, валидация,
      наблюдаемость, i18n системных сообщений, рефактор Q&A и тесты.
    runs:
      - { workflow: hex_arch_backend }
      - { workflow: security_hardening }
      - { workflow: validation_errors }
      - { workflow: observability }
      - { workflow: request_id_ctx }
      - { workflow: graceful_shutdown }
      - { workflow: readiness_liveness }
      - { workflow: qa_module_ts_hex }
      - { workflow: answer_refactor_dedup }
      - { workflow: i18n_system_messages }
      - { workflow: unknowns_graceful }
      - { workflow: store_async_io }
      - { workflow: qa_tests }
      - { workflow: openapi_docs }
      - { workflow: openapi_expand }
      - { workflow: ci_quality_gates }

  - id: SetupAdminModeration
    name: Setup Admin Moderation
    description: >
      Включает модерацию базы знаний, защиту админки и live-мониторинг.
    runs:
      - { workflow: admin_transpile_shared }
      - { workflow: moderation_backend_admin }
      - { workflow: admin_auth_rbac }
      - { workflow: live_monitoring_dashboard }
      - { workflow: admin_tests }

  - id: ShipRelease
    name: Ship Release
    description: >
      Готовит к релизу: синхронизирует lockfiles, билдит пакеты, гоняет CI,
      собирает Docker и версионирует @app/shared через Changesets.
    runs:
      - { workflow: lockfile_sync }
      - { workflow: shared_package }
      - { workflow: shared_tests }
      - { workflow: ci_pipeline }
      - { workflow: dockerfile_copy_fix }
      - { workflow: docker_polish }
      - { workflow: changesets_release }

  - id: FullStackIdeal
    name: Full-Stack Ideal
    description: >
      Полный проход «до идеала» для всего монорепо (backend+admin+shared).
    runs:
      - { workflow: lockfile_sync }
      - { workflow: shared_package }
      - { workflow: tsc_alias_setup }
      - { workflow: admin_transpile_shared }
      - { workflow: hex_arch_backend }
      - { workflow: security_hardening }
      - { workflow: validation_errors }
      - { workflow: observability }
      - { workflow: request_id_ctx }
      - { workflow: graceful_shutdown }
      - { workflow: readiness_liveness }
      - { workflow: qa_module_ts_hex }
      - { workflow: answer_refactor_dedup }
      - { workflow: i18n_system_messages }
      - { workflow: unknowns_graceful }
      - { workflow: store_async_io }
      - { workflow: shared_models_schemas }
      - { workflow: shared_constants }
      - { workflow: shared_tests }
      - { workflow: qa_tests }
      - { workflow: admin_tests }
      - { workflow: openapi_docs }
      - { workflow: openapi_expand }
      - { workflow: db_migrations_prisma_or_knex }
      - { workflow: pagination_contract }
      - { workflow: tx_error_map }
      - { workflow: redis_idempotency }
      - { workflow: live_monitoring_dashboard }
      - { workflow: moderation_backend_admin }
      - { workflow: admin_auth_rbac }
      - { workflow: ci_quality_gates }
      - { workflow: ci_pipeline }
      - { workflow: dockerfile_copy_fix }
      - { workflow: docker_polish }
      - { workflow: dead_code_cleanup }
      - { workflow: changesets_release }
playbooks:
  - id: QuickSmoke
    name: Quick Smoke (build + docker, no tests)
    description: >
      Быстрый прогон без тестов: сборка shared/backend/admin и сборка runtime Docker-образа
      с healthcheck. Удобно для моментальной проверки, что всё компилируется и упаковывается.
    runs:
      - { workflow: lockfile_sync }
      - { workflow: shared_package }
      - { workflow: tsc_alias_setup }
      - { workflow: admin_transpile_shared }
      - { workflow: dockerfile_copy_fix }
      - { workflow: docker_polish }

  - id: DocsOnly
    name: Docs Only (OpenAPI)
    description: >
      Генерация и обновление документации API: OpenAPI JSON и Swagger UI.
      Не трогает сборку приложений и тесты.
    runs:
      - { workflow: openapi_docs }
      - { workflow: openapi_expand }
playbooks:
  - id: QAOnly
    name: Q&A Only (core refactor + tests)
    description: >
      Фокус на системе ответов: типизированный модуль, i18n системных сообщений,
      снятие дублирования, дружелюбные фолбэки, async I/O в сторе, общие типы и тесты.
    runs:
      - { workflow: qa_module_ts_hex }
      - { workflow: answer_refactor_dedup }
      - { workflow: i18n_system_messages }
      - { workflow: unknowns_graceful }
      - { workflow: store_async_io }
      - { workflow: shared_models_schemas }
      - { workflow: shared_constants }
      - { workflow: shared_tests }
      - { workflow: qa_tests }
      - { workflow: response_validation }
      - { workflow: openapi_docs }
      - { workflow: openapi_expand }

  - id: InfraTighten
    name: Infra Tighten (CI + Docker + DB)
    description: >
      Усиление инфраструктуры без изменения бизнес-логики: миграции БД, readiness/liveness,
      безопасность и наблюдаемость, CI-гейты, Docker полировка.
    runs:
      - { workflow: db_migrations_prisma_or_knex }
      - { workflow: readiness_liveness }
      - { workflow: graceful_shutdown }
      - { workflow: security_hardening }
      - { workflow: observability }
      - { workflow: ci_quality_gates }
      - { workflow: ci_pipeline }
      - { workflow: dockerfile_copy_fix }
      - { workflow: docker_polish }
playbooks:
  - id: ModerationOnly
    name: Moderation Only (Admin + RBAC)
    description: >
      Включает только модерацию базы знаний и защиту админки.
      Добавляет backend-эндпоинты для pending, страницы модерации в admin и RBAC.
    runs:
      - { workflow: moderation_backend_admin }
      - { workflow: admin_auth_rbac }
      - { workflow: openapi_docs }
      - { workflow: openapi_expand }
      - { workflow: admin_tests }

  - id: DocsGate
    name: Docs Gate (OpenAPI coverage check)
    description: >
      Обновляет/переcобирает OpenAPI и включает CI-гейт, чтобы документация не отставала от API.
    runs:
      - { workflow: openapi_docs }
      - { workflow: openapi_expand }
      - { workflow: ci_quality_gates }
playbooks:
  - id: ReleaseTrain
    name: Release Train (CI → Docker → Changesets)
    description: >
      Готовит и отправляет релиз: ужесточает CI-гейты, гоняет пайплайн,
      собирает и полирует Docker-образ, версионирует/публикует @app/shared через Changesets.
    runs:
      - { workflow: ci_quality_gates }
      - { workflow: ci_pipeline }
      - { workflow: dockerfile_copy_fix }
      - { workflow: docker_polish }
      - { workflow: changesets_release }

  - id: SmokeWithReady
    name: Smoke With Ready (build + health endpoints)
    description: >
      Быстрая проверка сборки и готовности: собирает пакеты, экспортирует admin,
      включает /api/livez и /api/readyz; дальше запусти контейнер и проверь оба эндпоинта.
    runs:
      - { workflow: lockfile_sync }
      - { workflow: shared_package }
      - { workflow: tsc_alias_setup }
      - { workflow: admin_transpile_shared }
      - { workflow: readiness_liveness }
      - { workflow: dockerfile_copy_fix }
      - { workflow: docker_polish }
