#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/eg-shop"
REPO_URL="${REPO_URL:-}"

if [ -z "$REPO_URL" ]; then
  echo "REPO_URL gerekli. Ornek:"
  echo "REPO_URL=https://github.com/kullanici/depo.git sudo -E bash deploy/deploy.sh"
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi

cd "$APP_DIR"
node scripts/build.mjs
chown -R www-data:www-data "$APP_DIR"
find "$APP_DIR" -type d -exec chmod 755 {} \;
find "$APP_DIR" -type f -exec chmod 644 {} \;

nginx -t
systemctl reload nginx

echo "Deploy tamamlandi: http://178.105.240.35"

