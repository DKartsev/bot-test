# ---------- deps: ставим dev для shared И backend из КОРНЯ ----------
FROM node:20-bookworm-slim AS backend_deps
WORKDIR /app

# корневой lockfile обязателен для npm workspaces
COPY package*.json ./
# метаданные воркспейсов
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json  ./packages/shared/

# ставим prod+dev зависимости двух воркспейсов и вырубаем prepare/postinstall (husky)
RUN npm ci --include=dev -w packages/shared -w packages/backend --ignore-scripts


# ---------- build: используем node_modules из deps ----------
FROM node:20-bookworm-slim AS backend_build
WORKDIR /app

# общий node_modules (npm workspaces hoist)
COPY --from=backend_deps /app/node_modules ./node_modules

# исходники
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# корневые tsconfig* нужны, т.к. пакеты делают extends на tsconfig.base.json
COPY tsconfig*.json ./

# СНАЧАЛА собираем shared, потом backend
RUN npm --prefix packages/shared run build
RUN npm --prefix packages/backend run build


# ---------- runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# для npm workspaces ОБЯЗАТЕЛЕН корневой package.json
COPY package*.json ./
COPY packages/shared/package*.json  ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# ставим только prod зависимости и без скриптов (чтобы не вызывался prepare:husky)
RUN npm ci --omit=dev -w packages/shared -w packages/backend --ignore-scripts

# копируем билд-артефакты
COPY --from=backend_build /app/packages/shared/dist   ./packages/shared/dist
COPY --from=backend_build /app/packages/backend/dist ./packages/backend/dist

# без root
RUN chown -R node:node /app
USER node

# порт может прилететь из Render
ENV PORT=3000
EXPOSE $PORT

# Healthcheck учитывает $PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "const http=require('http');const p=process.env.PORT||3000;http.get(`http://127.0.0.1:${p}/api/health`,res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node","packages/backend/dist/http/main.js"]
