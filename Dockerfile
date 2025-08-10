# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ git
RUN npm ci
COPY . .
RUN npm run build
RUN npm --prefix packages/operator-admin ci
RUN npm --prefix packages/operator-admin run build
RUN npm --prefix packages/operator-admin run export

FROM node:20-alpine AS runner
RUN apk add --no-cache tini \
  && (addgroup -g 10001 -S node || true) \
  && (adduser -S -G node -u 10001 node || true)
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/packages/operator-admin/out ./admin-out
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
USER node
ENTRYPOINT ["tini","--"]
CMD ["node","dist/index.js"]
