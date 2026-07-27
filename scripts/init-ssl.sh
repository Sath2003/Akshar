#!/usr/bin/env bash
# scripts/init-ssl.sh
# ──────────────────────────────────────────────────────────────────────────────
# Bootstraps Let's Encrypt TLS certificates for the Akshar platform.
# Run this once on the EC2 instance before starting the full production stack.
#
# Usage:
#   ./scripts/init-ssl.sh
#
# Required environment variables (from .env):
#   APP_DOMAIN         e.g. sathvikdevops.online
#   LETSENCRYPT_EMAIL  your real email address for Let's Encrypt notifications
#
# Optional:
#   LETSENCRYPT_STAGING=true   use Let's Encrypt staging (for testing)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Load .env if present ──────────────────────────────────────────────────────
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck source=../.env
  source "$PROJECT_ROOT/.env"
  set +a
fi

# ── Validate required variables ───────────────────────────────────────────────
if [[ -z "${APP_DOMAIN:-}" ]]; then
  echo "[init-ssl] ERROR: APP_DOMAIN is not set. Add it to your .env file."
  exit 1
fi

if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "[init-ssl] ERROR: LETSENCRYPT_EMAIL is not set. Add it to your .env file."
  exit 1
fi

STAGING="${LETSENCRYPT_STAGING:-false}"
CERT_PATH="$PROJECT_ROOT/certbot/conf/live/$APP_DOMAIN"
GENERATED_CONF="$PROJECT_ROOT/nginx/generated/nginx.conf"

echo "[init-ssl] Domain:  $APP_DOMAIN"
echo "[init-ssl] Staging: $STAGING"

# ── Step 1: Render the bootstrap HTTP-only Nginx config ──────────────────────
echo "[init-ssl] Rendering bootstrap Nginx configuration..."
mkdir -p "$PROJECT_ROOT/nginx/generated"
APP_DOMAIN="$APP_DOMAIN" envsubst '${APP_DOMAIN}' \
  < "$PROJECT_ROOT/nginx/templates/bootstrap-http.conf.template" \
  > "$GENERATED_CONF"

# ── Step 2: Start edge Nginx on port 80 (bootstrap mode) ─────────────────────
echo "[init-ssl] Starting edge Nginx (bootstrap mode)..."
cd "$PROJECT_ROOT"
docker compose up -d --no-deps nginx

echo "[init-ssl] Waiting for Nginx to be ready..."
sleep 5

# ── Step 3: Check if certificate already exists (idempotent) ─────────────────
if [[ -d "$CERT_PATH" ]]; then
  echo "[init-ssl] Certificate already exists at $CERT_PATH — skipping issuance."
  SKIP_CERTBOT=true
else
  SKIP_CERTBOT=false
fi

# ── Step 4: Run Certbot to issue certificate ──────────────────────────────────
if [[ "$SKIP_CERTBOT" == "false" ]]; then
  CERTBOT_ARGS=(
    "--webroot"
    "--webroot-path=/var/www/certbot"
    "-d" "$APP_DOMAIN"
    "--email" "$LETSENCRYPT_EMAIL"
    "--agree-tos"
    "--no-eff-email"
    "--non-interactive"
  )

  if [[ "$STAGING" == "true" ]]; then
    CERTBOT_ARGS+=("--staging")
    echo "[init-ssl] Using Let's Encrypt STAGING endpoint."
  fi

  echo "[init-ssl] Requesting certificate from Let's Encrypt..."
  docker compose run --rm certbot certonly "${CERTBOT_ARGS[@]}"
fi

# ── Step 5: Render the production HTTPS Nginx config ─────────────────────────
echo "[init-ssl] Rendering production HTTPS Nginx configuration..."
APP_DOMAIN="$APP_DOMAIN" envsubst '${APP_DOMAIN}' \
  < "$PROJECT_ROOT/nginx/templates/production-https.conf.template" \
  > "$GENERATED_CONF"

# ── Step 6: Validate and reload Nginx ────────────────────────────────────────
echo "[init-ssl] Validating Nginx configuration..."
docker compose exec nginx nginx -t

echo "[init-ssl] Reloading Nginx..."
docker compose exec nginx nginx -s reload

# ── Step 7: Start the complete application stack ──────────────────────────────
echo "[init-ssl] Starting the full application stack..."
docker compose up -d

echo ""
echo "[init-ssl] ✅ Done!"
echo "  https://$APP_DOMAIN            → frontend"
echo "  https://$APP_DOMAIN/api/v1/health → backend health check"
echo ""
echo "  Cron renewal:"
echo "  0 3 * * * cd $PROJECT_ROOT && ./scripts/renew-ssl.sh >> /var/log/akshar-certbot.log 2>&1"
