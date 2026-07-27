FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl

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

# Generate Prisma client (must happen after schema is copied)
RUN npx prisma generate --schema=backend/prisma/schema.prisma

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

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/src/server.js"]
