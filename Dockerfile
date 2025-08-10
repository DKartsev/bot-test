# ---------- Backend deps cache ----------
FROM node:20-bookworm-slim AS backend_deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --include=dev

# ---------- Admin deps cache ----------
FROM node:20-bookworm-slim AS admin_deps
WORKDIR /app/admin
COPY admin/package*.json ./
RUN npm ci --include=dev

# ---------- Backend build ----------
FROM node:20-bookworm-slim AS backend_build
WORKDIR /app
# bring deps layer
COPY --from=backend_deps /app/backend/node_modules ./backend/node_modules
# copy sources
COPY backend ./backend
# explicit TS build using provided config
RUN npm --prefix backend run build

# ---------- Admin build+export ----------
FROM node:20-bookworm-slim AS admin_build
WORKDIR /app
# bring deps layer
COPY --from=admin_deps /app/admin/node_modules ./admin/node_modules
# copy sources
COPY admin ./admin
# build then static export to admin-out
RUN npm --prefix admin run build && npm --prefix admin run export

# ---------- Runtime (slim) ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# install prod deps only
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev

# copy build artifacts
COPY --from=backend_build /app/backend/dist ./backend/dist
COPY --from=admin_build   /app/admin/admin-out ./admin/admin-out

# expose and start backend; backend should serve /app/admin/admin-out if desired
ENV ADMIN_STATIC_DIR=/app/admin/admin-out
EXPOSE 3000
CMD ["npm", "--prefix", "backend", "run", "start"]
