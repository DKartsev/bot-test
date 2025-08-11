FROM node:20-bookworm-slim AS backend_deps
WORKDIR /app
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/
WORKDIR /app/packages/backend
RUN npm ci --include=dev

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
# важно: корневой package.json нужен для npm workspaces (-w)
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/
RUN npm ci --omit=dev -w packages/shared -w packages/backend
COPY --from=backend_build /app/packages/shared/dist   ./packages/shared/dist
COPY --from=backend_build /app/packages/backend/dist ./packages/backend/dist
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', res => process.exit(res.statusCode===200?0:1)).on('error', () => process.exit(1))"
CMD ["node","packages/backend/dist/http/main.js"]
