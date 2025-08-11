FROM node:20-bookworm-slim AS backend_deps
WORKDIR /app

# нужен корневой lockfile для npm workspaces
COPY package*.json ./
# описания пакетов воркспейсов (для разрешения зависимостей)
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json  ./packages/shared/

# ставим dev-зависимости ТОЛЬКО для backend, используя корневой lockfile
# выключаем любые install/prepare/postinstall (husky и т.п.)
RUN npm ci --include=dev -w packages/backend --ignore-scripts

FROM node:20-bookworm-slim AS backend_build
WORKDIR /app
COPY --from=backend_deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
RUN npm --prefix packages/shared run build
RUN npm --prefix packages/backend run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# корневой package*.json ОБЯЗАТЕЛЕН до npm ci -w
COPY package*.json ./
COPY packages/shared/package*.json  ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# прод-зависимости для shared и backend из корневого lockfile
# и без скриптов, чтобы не вызывался prepare:husky
RUN npm ci --omit=dev -w packages/shared -w packages/backend --ignore-scripts
COPY --from=backend_build /app/packages/shared/dist   ./packages/shared/dist
COPY --from=backend_build /app/packages/backend/dist ./packages/backend/dist
RUN chown -R node:node /app
USER node
ENV PORT=3000
EXPOSE $PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', res => process.exit(res.statusCode===200?0:1)).on('error', () => process.exit(1))"
CMD ["node","packages/backend/dist/http/main.js"]
