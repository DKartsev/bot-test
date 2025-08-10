version: 1
name: monorepo-backend-admin
summary: |
  Operational playbook for Code Agents. Monorepo contains a TypeScript backend (Node/Express)
  and a Next.js admin app that is built and statically exported. Docker uses a multi-stage
  build with separate dependency caches for backend and admin, and a slim runtime image.

repo:
  packages:
    backend:
      path: backend
      language: typescript
      build: "npm --prefix backend run build"
      start: "npm --prefix backend run start"
      lockfile: backend/package-lock.json
      tsconfig: backend/tsconfig.build.json
    admin:
      path: admin
      framework: nextjs
      build: "npm --prefix admin run build"
      export: "npm --prefix admin run export"
      outDir: admin/admin-out
      lockfile: admin/package-lock.json

runtime:
  node: "20"
  npm: ">=10 <12"
  env:
    NODE_ENV: production
    ADMIN_STATIC_DIR: /app/admin/admin-out

workflows:
  - id: sync-lockfiles
    name: Sync lockfiles (fix npm ci mismatches)
    description: Align package.json with package-lock.json for each package.
    triggers: [manual, on-deps-change, on-ci-failure]
    steps:
      - run: rm -rf backend/node_modules backend/package-lock.json
      - run: rm -rf admin/node_modules admin/package-lock.json
      - run: npm --prefix backend install --package-lock-only
      - run: npm --prefix admin install --package-lock-only
      - run: npm --prefix backend ci
      - run: npm --prefix admin ci
      - commit:
          message: "chore(lock): refresh backend/admin lockfiles"
          include:
            - backend/package-lock.json
            - admin/package-lock.json
    success_criteria:
      - file_exists: backend/package-lock.json
      - file_exists: admin/package-lock.json
      - cmd: "npm --prefix backend ci && npm --prefix admin ci"

  - id: build-backend
    name: Build backend (TypeScript)
    steps:
      - ensure_file: backend/tsconfig.build.json
      - run: npm --prefix backend run build
    outputs:
      - path: backend/dist
    success_criteria:
      - dir_exists: backend/dist

  - id: build-admin-export
    name: Build and export admin (Next.js static export)
    steps:
      - ensure_file: admin/next.config.js
      - run: npm --prefix admin run build
      - run: npm --prefix admin run export
    outputs:
      - path: admin/admin-out
    success_criteria:
      - dir_exists: admin/admin-out
      - file_exists: admin/admin-out/index.html

  - id: docker-build-runtime
    name: Docker multi-stage build (slim runtime)
    steps:
      - run: docker build --file Dockerfile --target runtime -t app:latest .
    success_criteria:
      - cmd: docker image inspect app:latest

  - id: serve-admin-from-backend
    name: Ensure backend serves admin static bundle
    steps:
      - verify_env: ADMIN_STATIC_DIR
      - code_check:
          path: backend/src
          must_include: "express.static"
    success_criteria:
      - http: {url: "http://localhost:3000/admin", status: 200}

agents:
  - id: DepsAgent
    role: Dependency & Lockfile Agent
    goals:
      - Keep lockfiles in sync to satisfy `npm ci` in Docker builds.
      - Pin TypeScript to 5.9.2 in all packages that require it.
    actions:
      - workflow: sync-lockfiles
    acceptance:
      - `npm ci` succeeds in local and CI for backend/admin.

  - id: BackendAgent
    role: Backend Build Agent
    goals:
      - Compile TypeScript with explicit tsconfig (tsconfig.build.json).
      - Produce `backend/dist` and a reliable `start` command.
    actions:
      - workflow: build-backend
    acceptance:
      - `node backend/dist/server.js` starts without TS runtime deps.

  - id: AdminAgent
    role: Next.js Admin Agent
    goals:
      - Build and static-export Next admin into `admin/admin-out`.
      - Ensure `next.config.js` has `output: 'export'` and `images.unoptimized: true`.
    actions:
      - workflow: build-admin-export
    acceptance:
      - `admin/admin-out` contains static HTML and assets.

  - id: DockerAgent
    role: Docker/Infra Agent
    goals:
      - Build multi-stage image using separate dep caches for backend/admin and a slim runtime.
      - Copy only artifacts into runtime; install only prod deps.
    actions:
      - workflow: docker-build-runtime
    acceptance:
      - Image size minimized; container starts and serves `/admin`.

  - id: CIAgent
    role: CI Agent
    goals:
      - Use Node 20 to avoid lockfile drift.
      - Cache Docker layers where available.
    checklist:
      - uses: actions/setup-node@v4 with node-version: '20'
      - run: docker build --target runtime

  - id: QAAagent
    role: QA Agent
    goals:
      - Verify `/admin` is reachable from backend.
      - Validate basic API routes return 200.
    acceptance:
      - Both `/admin` and main API endpoints respond 200 in staging.

policies:
  coding:
    - No devDependencies in runtime image.
    - No writes to `admin/admin-out` at runtime.
    - No `npm install` during container start.
  security:
    - Never commit secrets; rely on env variables.
    - Enforce engine-strict via `.npmrc`.

files_of_interest:
  - .nvmrc
  - .npmrc
  - .dockerignore
  - Dockerfile
  - backend/package.json
  - backend/tsconfig.build.json
  - admin/package.json
  - admin/next.config.js
