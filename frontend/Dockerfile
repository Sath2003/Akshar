FROM node:22.12.0-alpine AS base
WORKDIR /app

FROM base AS builder
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
RUN npm ci

COPY shared ./shared
COPY frontend ./frontend
RUN npm run build --workspace=@education/shared
RUN npm run build --workspace=@education/frontend

FROM nginx:1.27.4-alpine AS runner
# Copy custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
# Copy built static files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
