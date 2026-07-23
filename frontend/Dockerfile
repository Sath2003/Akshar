FROM node:22.12.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

COPY shared ./shared
COPY frontend ./frontend
RUN pnpm --filter @education/shared build
RUN pnpm --filter @education/frontend build

FROM nginx:1.27.4-alpine AS runner
# Copy custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
# Copy built static files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
