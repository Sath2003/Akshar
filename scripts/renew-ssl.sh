#!/usr/bin/env bash
# scripts/renew-ssl.sh
# ──────────────────────────────────────────────────────────────────────────────
# Renews Let's Encrypt certificates and reloads Nginx.
# Designed to run as a cron job on the EC2 instance.
#
# Cron entry (add via: sudo crontab -e):
#   0 3 * * * cd /home/ubuntu/Akshar && ./scripts/renew-ssl.sh >> /var/log/akshar-certbot.log 2>&1
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIMESTAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

echo "[$TIMESTAMP] [renew-ssl] Starting certificate renewal..."

cd "$PROJECT_ROOT"

# ── Step 1: Run Certbot renewal ───────────────────────────────────────────────
echo "[$TIMESTAMP] [renew-ssl] Running certbot renew..."
docker compose run --rm certbot renew --webroot --webroot-path=/var/www/certbot

CERTBOT_EXIT=$?
if [[ $CERTBOT_EXIT -ne 0 ]]; then
  echo "[$TIMESTAMP] [renew-ssl] ERROR: certbot renew failed with exit code $CERTBOT_EXIT"
  exit $CERTBOT_EXIT
fi

# ── Step 2: Validate the Nginx configuration ──────────────────────────────────
echo "[$TIMESTAMP] [renew-ssl] Validating Nginx configuration..."
docker compose exec nginx nginx -t
NGINX_TEST_EXIT=$?

if [[ $NGINX_TEST_EXIT -ne 0 ]]; then
  echo "[$TIMESTAMP] [renew-ssl] ERROR: Nginx configuration test failed. NOT reloading."
  exit $NGINX_TEST_EXIT
fi

# ── Step 3: Reload Nginx gracefully ──────────────────────────────────────────
echo "[$TIMESTAMP] [renew-ssl] Reloading Nginx..."
docker compose exec nginx nginx -s reload

echo "[$TIMESTAMP] [renew-ssl] ✅ Certificate renewal completed successfully."
