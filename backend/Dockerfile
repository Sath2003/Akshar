FROM node:22.12.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile

COPY shared ./shared
COPY backend ./backend
RUN pnpm --filter @education/shared build
RUN pnpm --filter @education/backend build

# Remove development dependencies
RUN pnpm --filter @education/backend deploy --prod /prod/backend

FROM base AS runner
WORKDIR /app
COPY --from=builder /prod/backend /app

USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
