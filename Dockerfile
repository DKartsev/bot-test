# ---------- Backend deps cache ----------
FROM node:20-bookworm-slim AS backend_deps
WORKDIR /app/packages/backend
COPY packages/backend/package*.json ./
RUN npm ci --include=dev

# ---------- Admin deps cache ----------
FROM node:20-bookworm-slim AS admin_deps
WORKDIR /app/packages/admin
COPY packages/admin/package*.json ./
RUN npm ci --include=dev

# ---------- Backend build ----------
FROM node:20-bookworm-slim AS backend_build
WORKDIR /app
COPY --from=backend_deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY packages/backend ./packages/backend
RUN npm --prefix packages/backend run build

# ---------- Admin build+export ----------
FROM node:20-bookworm-slim AS admin_build
WORKDIR /app
COPY --from=admin_deps /app/packages/admin/node_modules ./packages/admin/node_modules
COPY packages/admin ./packages/admin
RUN npm --prefix packages/admin run build && npm --prefix packages/admin run export

# ---------- Runtime (slim) ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# install prod deps for backend
COPY packages/backend/package*.json ./packages/backend/
RUN npm ci --omit=dev -w packages/backend
# copy artifacts
COPY --from=backend_build /app/packages/backend/dist ./packages/backend/dist
COPY --from=admin_build   /app/packages/admin/admin-out ./packages/admin/admin-out
# set permissions and drop to non-root
RUN chown -R node:node /app
USER node
ENV ADMIN_STATIC_DIR=/app/packages/admin/admin-out
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["npm","--prefix","packages/backend","run","start"]
