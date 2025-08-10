# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# 1) только манифесты для кеша
COPY package.json package-lock.json ./
# если админка лежит в packages/operator-admin
RUN mkdir -p packages/operator-admin
COPY packages/operator-admin/package.json packages/operator-admin/package-lock.json ./packages/operator-admin/

# 2) установка зависимостей
RUN apk add --no-cache python3 make g++ git
RUN npm ci
RUN npm ci --prefix packages/operator-admin

# 3) копируем исходники и собираем
COPY . .
# скрипт сборки бэка (tsc / vite / whatever)
RUN npm run build
# скрипт сборки админки и экспорт статики (добавь их в package.json)
RUN npm run build:admin && npm run export:admin

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# только нужное
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/admin-out ./admin-out
COPY package.json package-lock.json ./

# прод-зависимости (если нужно)
RUN npm ci --omit=dev

EXPOSE 3000
CMD ["node","dist/index.js"]
