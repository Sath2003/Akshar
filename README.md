# Akshar Educational Platform

## Objective

Akshar is a full-stack educational platform for delivering interactive lessons to children.

## Supported Languages

- English (en)
- Hindi (hi)
- Kannada (kn)

## Supported Grade Levels

- Nursery
- LKG
- UKG

## Technology Stack

- **Frontend:** React + Vite
- **Backend:** Fastify + TypeScript
- **Database:** PostgreSQL
- **Infrastructure:** Docker Compose on AWS EC2
- **Voice Tools:** Python (Offline processing)

## Repository Structure

- `/frontend`: React SPA
- `/backend`: Fastify API server
- `/shared`: Common TypeScript schemas and utilities
- `/content`: Curriculum and lesson seed data
- `/voice-tools`: Offline utilities for TTS generation and validation

## Local Development Setup

1. Copy `.env.example` to `.env`
2. Start the database:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
3. Install dependencies and start the servers:
   ```bash
   pnpm install
   pnpm dev:frontend
   pnpm dev:backend
   ```
   The frontend is available at `http://localhost:5173` and proxies API requests to `http://localhost:4000`.

## Environment Configuration

- Never commit real secrets.
- Use `.env` and `.env.local` for local development.
- Production environment variables are managed directly on the EC2 instance.
- Avoid exposing backend secrets via `VITE_` variables.

## Manual Validation Commands

Use these commands before committing or deploying:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm validate-content
pnpm build
```

## Production Docker Architecture

The application runs on a single AWS EC2 instance using Docker Compose:

- **Caddy:** Reverse proxy and automatic HTTPS (ports 80/443). Routes `/api/*` to backend and other requests to frontend.
- **Frontend Nginx:** Serves the compiled React SPA.
- **Backend Fastify:** API server connected to PostgreSQL.
- **PostgreSQL:** Primary database with a persistent volume.

## Manual EC2 Deployment Outline

1. SSH into the EC2 instance.
2. Pull the latest code from the `main` branch.
3. Build the production containers: `docker compose -f docker-compose.prod.yml build`
4. Start/update the stack: `docker compose -f docker-compose.prod.yml up -d`

## Voice-tools Purpose

The `voice-tools` directory contains offline Python scripts used by content creators or administrators to generate child-friendly audio (using TTS providers like Azure) and validate it. Audio is uploaded to S3 manually after human review.

## Current Implementation Status

The repository-cleanup and scaffold phase is complete. The project is prepared for the next development phases with a simplified architecture and separated content module.

## Next Planned Phase

Authentication, Prisma curriculum models, and lesson development.
