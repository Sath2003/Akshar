FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY content/package.json ./content/
RUN npm ci --omit=dev

# Copy source
COPY shared ./shared
COPY backend ./backend
COPY content ./content

# Generate Prisma client
RUN npx prisma generate --schema=backend/prisma/schema.prisma

EXPOSE 4000

# Migrate then start
CMD ["sh", "-c", "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/src/server.js"]
