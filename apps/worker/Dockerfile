# Development stage для worker сервиса
FROM node:20-alpine AS development

WORKDIR /app

# System deps for building native modules и ffmpeg
RUN apk add --no-cache python3 build-base ffmpeg

# Копируем package.json файлы
COPY package*.json ./
COPY apps/worker/package*.json ./apps/worker/
COPY packages/shared/package*.json ./packages/shared/

# Устанавливаем зависимости для worker
WORKDIR /app/apps/worker
RUN npm install

# Копируем исходный код
COPY apps/worker ./apps/worker
COPY packages/shared ./packages/shared
COPY tsconfig*.json ./

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Передаем права на node_modules
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3003

# Запускаем worker в режиме разработки
WORKDIR /app/apps/worker
CMD ["node", "src/index.js"]

# Builder stage для production
FROM node:20-alpine AS builder

WORKDIR /app

# System deps for building
RUN apk add --no-cache python3 build-base ffmpeg

# Копируем package.json файлы
COPY package*.json ./
COPY apps/worker/package*.json ./apps/worker/
COPY packages/shared/package*.json ./packages/shared/

# Устанавливаем зависимости для сборки
WORKDIR /app/apps/worker
RUN npm install

# Копируем исходный код
COPY apps/worker ./apps/worker
COPY packages/shared ./packages/shared
COPY tsconfig*.json ./

# Собираем проект
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# System deps для production
RUN apk add --no-cache ffmpeg

# Копируем package.json файлы
COPY package*.json ./
COPY apps/worker/package*.json ./apps/worker/
COPY packages/shared/package*.json ./packages/shared/

# Устанавливаем только production зависимости
RUN npm install --omit=dev

# Копируем собранный код
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package*.json ./apps/worker/

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Передаем права
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3003

# Запускаем worker
WORKDIR /app/apps/worker
CMD ["npm", "start"]
