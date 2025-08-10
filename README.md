```markdown
# Backend + Admin Monorepo

TypeScript **backend** (Node/Express, ESM), **admin** (Next.js), and reusable **@app/shared** package.
Docker uses a **multi-stage** pipeline with separate dependency caches and a **slim runtime**.
This branch implements: unified ESM, strict TypeScript, shared package, security,
validation, unified error handling, async IO, tests, CI, and Docker.

## Highlights
- **Workspaces**: `packages/{shared,backend,admin}` with engine gates.
- **@app/shared**: distributable ESM lib with explicit exports and types.
- **ESM everywhere**: `"type": "module"`, TS `module=ESNext`, `moduleResolution=NodeNext`.
- **Strict TypeScript**: project refs; path aliases for `@app/shared` in TS (rewritten via `tsc-alias`).
- **Admin**: Next builds and **transpiles** `@app/shared`; static export to `admin/admin-out`.
- **Security**: dotenv-safe, Helmet, CORS, rate limit, AES-256-GCM; SQL safety.
- **Tests**: Vitest + coverage gates; Supertest for HTTP; shared unit tests.

## Structure
```

.
├─ packages/
│  ├─ shared/               # @app/shared (ESM lib)
│  │  ├─ src/
│  │  │  └─ greet/
│  │  ├─ dist/              # build output (generated)
│  │  └─ package.json
│  ├─ backend/              # Node/Express API (TS, ESM)
│  │  ├─ src/
│  │  ├─ dist/              # build output (generated)
│  │  └─ package.json
│  └─ admin/                # Next.js admin UI
│     ├─ app/ | pages/
│     ├─ public/
│     ├─ admin-out/         # static export (generated)
│     ├─ next.config.js
│     └─ package.json
├─ tsconfig.base.json
├─ Dockerfile
├─ .dockerignore
├─ .nvmrc
├─ .npmrc
└─ README.md

````

## TypeScript & Paths
The repo uses project references and a base config. For author-time DX, TS resolves `@app/shared` to source via
`tsconfig.base.json` paths, and **tsc-alias** rewrites paths at build time to runtime-safe imports.

## @app/shared
- Public API is re-exported from `src/index.ts` (e.g., a `greet` utility).
- Build once and consume from backend/admin:
```bash
npm run build -w packages/shared
````

```ts
import { greet } from '@app/shared';
```

## Admin (Next.js)

`packages/admin/next.config.js` includes:

```js
module.exports = {
  output: 'export',
  basePath: '/admin', // adjust if served at root
  images: { unoptimized: true },
  experimental: { externalDir: true },
  transpilePackages: ['@app/shared']
};
```

Run:

```bash
npm run build -w packages/admin && npm run export -w packages/admin
```

## Backend build

Backend uses `tsc` + `tsc-alias` to fix path aliases at runtime:

```bash
npm run build -w packages/backend
```

## CI (summary)

* Build shared → test shared → lint/test backend → build backend → build+export admin.

## Docker

Multi-stage image builds shared+backend/admin and ships a slim runtime. Admin is served from `/admin`.

## Security

* Do not commit secrets; use `dotenv-safe`.
* Only parameterized SQL or safe ORM APIs.

## Tests

* Shared and backend include Vitest with coverage gates.

````


```markdown
# Backend + Admin Monorepo

TypeScript **backend** (Node/Express, ESM) and **admin** (Next.js) in one repo.
Docker uses a **multi-stage** pipeline with separate dependency caches and a **slim runtime**.
This branch also implements the audit recommendations: unified ESM, strict TypeScript, security
hardening, validation, unified error handling, async IO, and comprehensive tests.

## Highlights
- **ESM everywhere**: `"type": "module"`, TS `module=ESNext`, `moduleResolution=NodeNext`.
- **Strict TypeScript**: high type coverage, no `any` in critical code paths.
- **Security**: dotenv-safe, Helmet, CORS allowlist, rate limiting, AES-256-GCM encryption,
  parameterized SQL (no string-built queries), secret scanning.
- **Validation**: Zod schemas + middleware.
- **Errors**: single `AppError` + centralized `errorHandler` middleware.
- **Async FS**: `fs/promises` only in request code paths.
- **Tests**: Vitest + coverage gates; Supertest for HTTP.
- **Admin**: Next build + static export to `admin/admin-out`.

## Structure
````

. ├─ backend/ │  ├─ src/ │  │  ├─ middleware/ │  │  ├─ validation/ │  │  ├─ errors/ │  │  └─ crypto/ │  ├─ dist/                   # build output (generated) │  ├─ package.json │  ├─ tsconfig.json │  └─ tsconfig.build.json ├─ admin/ │  ├─ pages/ | app/ │  ├─ public/ │  ├─ admin-out/              # static export (generated) │  ├─ next.config.js │  └─ package.json ├─ Dockerfile ├─ .dockerignore ├─ .nvmrc ├─ .npmrc ├─ MIGRATION\_GUIDE.md ├─ SECURITY.md └─ README.md

````

## Getting Started
- **Node**: 20 (see `.nvmrc`), **npm**: >=10 <12.
- Copy `.env.example` → `.env` and fill all variables.
- Install deps per package: `npm --prefix backend ci && npm --prefix admin ci`.
- Build:
```bash
npm run build:backend
npm run build:admin && npm run export:admin
````

* Run (dev): use your preferred dev scripts (e.g. `tsx`/`nodemon` in backend, `next dev` in admin).
* Run (Docker):

```bash
docker build --file Dockerfile --target runtime -t app:latest .
docker run --rm -p 3000:3000 -e NODE_ENV=production -e ADMIN_STATIC_DIR=/app/admin/admin-out app:latest
```

## Security

* Do not commit secrets. `dotenv-safe` enforces presence and schema of required env vars.
* Use HTTPS in production; enable Helmet and sane CORS.
* Use parameterized DB queries or a vetted ORM.
* Encrypt sensitive values at rest with AES-256-GCM; rotate keys.
* Run `gitleaks` (secret scan) and `npm audit` in CI.

## Validation

Define Zod schemas in `backend/src/validation` and apply via `validate()` middleware. Return 400 with `VALIDATION_ERROR` on invalid input.

## Error Handling

Throw `new AppError(code, message, status)` for expected failures. The global `errorHandler` formats API errors and hides stack traces in production.

## Tests

Use Vitest. Coverage gates are defined in `vitest.config.ts`. Example:

```bash
npm --prefix backend run test -- --run
```

## Lockfile Sync

```bash
rm -rf backend/node_modules backend/package-lock.json
rm -rf admin/node_modules admin/package-lock.json
npm --prefix backend install --package-lock-only && npm --prefix backend ci
npm --prefix admin install --package-lock-only && npm --prefix admin ci
```

Commit refreshed lockfiles.

## Admin Static Export

```bash
npm --prefix admin run build && npm --prefix admin run export
```

Serve from backend at `/admin` (see `ADMIN_STATIC_DIR`).

## Conventions

* Conventional Commits recommended.
* Lint/format before PR.

````

---

## 3) `MIGRATION_GUIDE.md`
```markdown
# Migration Guide (Audit → Hardened Architecture)

## Phase 0 — Safety
- Create a fresh branch, enable CI checks, and back up current env values.

## Phase 1 — Module System (ESM)
- Set `"type": "module"` in `backend/package.json` and `admin/package.json`.
- TS: `module=ESNext`, `moduleResolution=NodeNext`. Fix imports/exports.

## Phase 2 — Strict TypeScript
- Enable `strict`, `noImplicitAny`, `exactOptionalPropertyTypes`.
- Convert critical JS files to TS first (auth, persistence, payment flows).
- Target type-coverage ≥ 90%.

## Phase 3 — Security Hardening
- Add `dotenv-safe`, Helmet, CORS allowlist, rate limiting, body size limits.
- Parameterize SQL; replace string-built queries. Add tests to prevent regressions.
- Introduce AES-256-GCM encryption utility for at-rest secrets.

## Phase 4 — Validation & Errors
- Add Zod schemas for requests/responses.
- Add `validate()` middleware and central `errorHandler` + `AppError`.

## Phase 5 — Async IO
- Replace `fs.*Sync` with `fs/promises` in request paths.

## Phase 6 — Tests & Coverage
- Add Vitest + Supertest; coverage gates (≥85% statements/lines, ≥80% branches).
- Create unit & integration suites for critical paths.

## Phase 7 — Deduplicate Code
- Run `jscpd`; move shared logic into `backend/src/shared` (or a shared package).

## Phase 8 — Docker & CI
- Keep multi-stage Docker with separate dep caches; slim runtime.
- CI: Node 20, `npm ci`, tests, audit, gitleaks.

## Phase 9 — Rollout
- Staging deploy; run smoke tests; rotate keys; then production deploy.
````

---

## 4) `SECURITY.md`

```markdown
# Security Policy

## Secrets & Config
- Use `.env` with `dotenv-safe`; never commit secrets.
- Keep `ENCRYPTION_KEY_BASE64` as a 32-byte key (base64). Rotate quarterly.

## Transport & Headers
- HTTPS-only in production. Enable Helmet. Configure CORS allowlist.
- Limit request size and rate.

## Storage & SQL
- Encrypt sensitive fields at rest (AES-256-GCM).
- Use parameterized queries / ORM; forbid string-concatenated SQL.

## Scanning & Updates
- Run `gitleaks` and `npm audit` (or OSV) in CI.
- Patch high/critical vulnerabilities promptly.

## Incident Response
- Revoke/rotate keys on leak.
- Keep audit logs for auth and data access events.
```

---

## 5) `.env.example`

```dotenv
# Runtime
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000

# Admin static export mount
ADMIN_STATIC_DIR=/app/admin/admin-out

# Encryption (32-byte base64 key)
ENCRYPTION_KEY_BASE64=

# Database
DATABASE_URL=

# External services (examples)
API_KEY_THIRD_PARTY=
TELEGRAM_BOT_TOKEN=
```
