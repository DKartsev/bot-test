# Backend + Admin Monorepo

TypeScript **backend** (Node/Express) and **admin** app (Next.js) in a single repository.
Docker uses a **multi‑stage** pipeline that caches dependencies for backend and admin **separately**
and ships a **slim runtime** with only production code and dependencies.

## Highlights
- ✅ Separate dependency caches for **backend** and **admin** → faster Docker builds
- ✅ Explicit TypeScript build via `tsconfig.build.json` (no TS at runtime)
- ✅ Next.js **static export** for admin → served as `/admin` by backend or any static host
- ✅ Slim runtime image: prod deps only, small attack surface
- ✅ Clean images thanks to `.dockerignore` (excludes `dist`, `admin-out`, and other artifacts)

## Repo Structure

├─ backend/                # Node/Express TypeScript backend
│  ├─ src/
│  ├─ dist/                # build output (generated)
│  ├─ package.json
│  └─ tsconfig.build.json
├─ admin/                  # Next.js admin UI
│  ├─ pages/ | app/
│  ├─ public/
│  ├─ admin-out/           # static export output (generated)
│  ├─ next.config.js
│  └─ package.json
├─ Dockerfile              # multi-stage build
├─ .dockerignore
├─ .nvmrc
└─ README.md

## Requirements
- Node **20** (see `.nvmrc`)
- npm **>=10 <12**

Optional but recommended:
- Docker 24+
- GitHub Actions (or any CI) with Node 20

## Scripts (root)
```json
{
  "scripts": {
    "build": "npm run build:backend && npm run build:admin",
    "build:backend": "npm --prefix backend run build",
    "build:admin": "npm --prefix admin run build",
    "export:admin": "npm --prefix admin run export",
    "build:docker": "npm run build && npm run export:admin"
  }
}
Backend (TypeScript)

backend/package.json:
{
  "scripts": {
    "clean": "rimraf dist",
    "build": "npm run clean && tsc -p tsconfig.build.json",
    "start": "node dist/server.js"
  },
  "devDependencies": { "typescript": "5.9.2" }
}
backend/tsconfig.build.json:
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": false,
    "declaration": false,
    "noEmit": false
  },
  "include": ["src/**/*"]
}
Admin (Next.js static export)

admin/package.json:
{
  "scripts": {
    "clean": "rimraf .next admin-out",
    "build": "npm run clean && next build",
    "export": "next export -o admin-out"
  }
}
admin/next.config.js:
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true }
};
module.exports = nextConfig;
Docker

Multi-stage Dockerfile with separate dep caches and a slim runtime.

Build locally:
docker build --file Dockerfile --target runtime -t app:latest .
Run:
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e ADMIN_STATIC_DIR=/app/admin/admin-out \
  app:latest
Backend listens on :3000. Admin static export will be available under /admin if backend is configured to serve it.

Serving the admin bundle from backend

In your backend server (Express):
import express from 'express';
import path from 'path';

const app = express();
const adminDir = process.env.ADMIN_STATIC_DIR || path.join(__dirname, '../admin-out');
app.use('/admin', express.static(adminDir, { fallthrough: true }));

// ...other routes
app.listen(3000, () => console.log('Server running on :3000'));
CI Recommendations

Use Node 20 in CI to avoid lockfile drift

Cache Docker layers if available

GitHub Actions snippet:
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

- name: Build Docker image
  run: |
    docker build --file Dockerfile --target runtime -t app:latest .
Lockfile Sync (fixing npm ci errors)

If you hit npm ci errors like “Missing: typescript@5.9.2 from lock file”:
rm -rf backend/node_modules backend/package-lock.json
rm -rf admin/node_modules admin/package-lock.json
npm --prefix backend install --package-lock-only
npm --prefix admin   install --package-lock-only
npm --prefix backend ci
npm --prefix admin   ci
Commit refreshed lockfiles.

.dockerignore (recommended)
node_modules
**/node_modules
npm-debug.log*
.DS_Store
.env
.env.*

# build caches and artifacts
dist
admin-out
.next
.turbo
.cache
coverage
build
Troubleshooting

npm ci fails in Docker → lockfile mismatch. Regenerate per package as above.

Admin images missing after export → ensure images.unoptimized: true in next.config.js when using static export.

Runtime container larger than expected → verify runtime stage installs with --omit=dev and only copies built artifacts.

License

MIT (or your preferred license)
