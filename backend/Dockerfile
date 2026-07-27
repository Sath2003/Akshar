FROM node:22.12.0-alpine AS base
WORKDIR /app

# ── Build stage ───────────────────────────────────────────────────────────────
FROM base AS builder

# Copy workspace manifests first (layer cache)
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY content/package.json ./content/

RUN npm ci

# Copy source
COPY shared ./shared
COPY backend ./backend
COPY content ./content

# Remove development-only dependencies
RUN npm prune --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM base AS runner

# Copy pruned node_modules and source from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/content ./content

# Run as non-root user
USER node

EXPOSE 4000
CMD ["node", "backend/src/server.js"]
