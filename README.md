# Akshar Educational Platform

An interactive educational platform delivering alphabet, number, and vocabulary lessons to children in English, Hindi, and Kannada.

## Supported Languages

| Code | Language |
|------|----------|
| `en` | English  |
| `hi` | Hindi    |
| `kn` | Kannada  |

## Supported Grade Levels

- Nursery (age 3–4)
- LKG (age 4–5)
- UKG (age 5–6)

---

## Technology Stack

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| Frontend       | React 19 + Vite + TypeScript                    |
| Backend        | Fastify 5 + JavaScript ES modules               |
| Shared         | JavaScript + Zod                                |
| Content        | JavaScript content modules                      |
| Database       | PostgreSQL 16                                   |
| Assessment AI  | Gemini (open-ended grading)                     |
| Lesson Audio   | Offline Azure Speech generation → S3            |
| Public Proxy   | Nginx (edge reverse proxy)                      |
| TLS            | Certbot + Let's Encrypt                         |
| Deployment     | Docker Compose on AWS EC2                       |

---

## Repository Structure

```
/
├── frontend/          React SPA (TypeScript + Vite)
├── backend/           Fastify API (JavaScript ES modules)
├── shared/            Shared Zod schemas and language utilities
├── content/           Curriculum data and content validator
├── voice-tools/       Offline Python TTS scripts (admin use only)
├── nginx/             Edge nginx configuration templates
├── certbot/           Let's Encrypt webroot (generated at deploy time)
├── scripts/           Deployment and SSL management scripts
└── docs/              Deployment and API documentation
```

---

## Local Development Setup

### Prerequisites

- Node.js ≥ 22.12.0
- npm ≥ 10
- Docker + Docker Compose

### Install dependencies

```bash
npm ci
```

### Start the database

```bash
docker compose up -d postgres
```

### Run development servers

```bash
# Frontend (http://localhost:5173)
npm run dev:frontend

# Backend (http://localhost:4000)
npm run dev:backend
```

The Vite dev server proxies `/api/*` to `http://localhost:4000`.

---

## Validation Commands

Run all of these before committing:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run validate-content
npm run build
```

---

## Production Docker Architecture

```
Internet (80/443)
     |
 [Edge Nginx]          ← public, terminates TLS
     |
     +-- /api/* --> [Backend: Fastify:4000]  --> [PostgreSQL]
     |
     +-- /*      --> [Frontend: nginx:80]    (React SPA)
```

- Only port 80 and 443 are publicly accessible.
- Backend, frontend, and PostgreSQL have no public host-port bindings.
- pgAdmin is disabled by default; start it with `--profile tools`.

---

## EC2 Deployment

See [docs/EC2_DEPLOYMENT.md](docs/EC2_DEPLOYMENT.md) for the complete deployment guide.

**Quick start (after initial SSL setup):**

```bash
git clone https://github.com/Sath2003/Akshar.git
cd Akshar
cp .env.example .env
# Edit .env with your values
./scripts/init-ssl.sh
```

---

## Assessment API

See [docs/ASSESSMENT_API.md](docs/ASSESSMENT_API.md).

**Endpoint:** `POST /api/v1/assess`

The frontend never sends the correct answer. The backend resolves the authoritative answer by question ID.

---

## Audio Workflow

See [docs/AUDIO_WORKFLOW.md](docs/AUDIO_WORKFLOW.md).

Audio is pre-generated offline using `voice-tools/` (Azure Speech SDK) and uploaded to S3 after human review. The backend serves short-lived signed S3 URLs.

---

## Optional pgAdmin

```bash
docker compose --profile tools up -d pgadmin
# Access at http://127.0.0.1:5050 (localhost only — never public)
```
