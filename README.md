# Backend + Admin Monorepo

TypeScript **backend** (Node/Fastify, ESM), **admin** (Next.js), and reusable **@app/shared** package.
Docker uses a **multi-stage** pipeline with separate dependency caches and a **slim runtime**.
This branch implements: unified ESM, strict TypeScript, shared package, security,
validation, unified error handling, async IO, tests, CI, and Docker.

## Highlights

- **Workspaces**: `packages/{shared,backend,admin}` with engine gates.
- **@app/shared**: distributable ESM lib with explicit exports and types.
- **ESM everywhere**: `"type": "module"`, TS `module=NodeNext`, `moduleResolution=NodeNext`.
- **Strict TypeScript**: project refs; path aliases for `@app/shared` in TS (rewritten via `tsc-alias`).
- **Admin**: Next builds and **transpiles** `@app/shared`; static export to `admin/admin-out`.
- **Security**: dotenv-safe, Helmet, CORS, rate limit, AES-256-GCM; SQL safety.
- **Tests**: Vitest + coverage gates; Supertest for HTTP; shared unit tests.

## Structure

```
.
├─ packages/
│  ├─ shared/               # @app/shared (ESM lib)
│  ├─ backend/              # Node/Fastify API (TS, ESM)
│  └─ admin/                # Next.js admin UI
├─ tsconfig.base.json
├─ Dockerfile
└─ README.md
```

## Getting Started

1. **Node**: Use version 20 (see `.nvmrc`).
2. **Install Deps**: `npm install` in the root directory.
3. **Environment**: Copy `.env.example` to `.env` and fill in the required variables. At a minimum, you will need `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`, and `JWT_SECRET`.
4. **Run Migrations**: `npm run db:migrate -w packages/backend`
5. **Run Backend**: `npm run dev -w packages/backend`
6. **Run Admin UI**: `npm run dev -w packages/admin` (if applicable)

## Admin API

The backend exposes a secure Admin API under the `/api/admin` prefix.

### Authentication

Authentication is handled via JWTs. To access protected endpoints, include an `Authorization` header with a valid JWT.

```
Authorization: Bearer <your_jwt>
```

The JWT payload must include a `role` field, which can be `admin` or `operator`.

### Endpoints

- `GET /api/admin/chats`: List and filter chats.
- `GET /api/admin/chats/{id}`: Get details for a single chat.
- `POST /api/admin/chats/{id}/assign`: Assign an operator to a chat.
- `POST /api/admin/chats/{id}/status`: Change a chat's status.
- `POST /api/admin/chats/{id}/messages`: Send a message as an operator.
- `GET /api/admin/users/{id}`: Get a user's summary (placeholder).
- `GET /api/admin/events`: SSE endpoint for real-time updates (`message.new`, `chat.assigned`, `chat.status_changed`).

## Testing

To run the test suite for the backend:

```bash
npm run test -w packages/backend
```
