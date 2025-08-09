# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY scripts ./scripts
# Install build tools for native deps like hnswlib-node
RUN apk add --no-cache python3 make g++ git
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
RUN apk add --no-cache tini \
  && (addgroup -g 10001 -S node || true) \
  && (adduser -S -G node -u 10001 node || true)
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY data ./data
COPY logs ./logs
COPY feedback ./feedback
COPY package.json README.md ./
COPY scripts ./scripts
RUN mkdir -p /app/data /app/logs /app/feedback \
  && chown -R node:node /app
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3000/healthz || exit 1
USER node
ENTRYPOINT ["tini","--"]
CMD ["node","src/api/server.js"]
