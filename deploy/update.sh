#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/eg-shop}"
cd "$APP_DIR"
if ! git diff --quiet -- dist; then
  echo "Generated dist changes are being refreshed."
  git restore --worktree -- dist
fi
git pull --ff-only origin main
npm run build
nginx -t
systemctl reload nginx
echo "Update completed."
