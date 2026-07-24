FROM node:22.12.0-alpine AS base
WORKDIR /app

FROM base AS builder
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN npm ci

COPY shared ./shared
COPY backend ./backend
# No build step required for JS backend/shared

# Remove development dependencies
RUN npm prune --omit=dev

FROM base AS runner
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend ./backend

USER node
EXPOSE 4000
CMD ["node", "backend/src/server.js"]
