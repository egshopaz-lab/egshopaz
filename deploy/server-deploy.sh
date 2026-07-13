#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR=/var/www/eg-shop
APP_DIR=/var/www/egshop
RELEASES_DIR="$APP_DIR/releases"
CURRENT_LINK="$APP_DIR/current"
BUILD_HOME="$APP_DIR/.build-home"
NPM_CACHE="$APP_DIR/.npm-cache"
REMOTE=origin
BRANCH=main

exec 9>/run/lock/egshop-deploy.lock
flock -n 9 || exit 0

cd "$REPO_DIR"
git fetch --prune "$REMOTE" "$BRANCH"
SHA="$(git rev-parse FETCH_HEAD)"
RELEASE_ID="github-${SHA:0:12}"
TARGET="$RELEASES_DIR/$RELEASE_ID"
ACTIVE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

if [[ "$ACTIVE" == "$TARGET" ]]; then
  echo "EG Shop is already on $RELEASE_ID"
  exit 0
fi

install -d -o egshop -g egshop "$RELEASES_DIR"
install -d -o egshop -g egshop "$BUILD_HOME"
install -d -o egshop -g egshop "$NPM_CACHE"

if [[ ! -f "$TARGET/.output/server/index.mjs" ]]; then
  install -d -o egshop -g egshop "$TARGET"
  git archive "$SHA" | tar -x -C "$TARGET"
  chown -R egshop:egshop "$TARGET"

  runuser -u egshop -- env     HOME="$BUILD_HOME"     npm_config_cache="$NPM_CACHE"     PATH=/usr/local/bin:/usr/bin:/bin     bash -c 'cd "$1" && npm ci --no-audit --no-fund && npm run typecheck && npm run build'     _ "$TARGET"
fi

NEXT_LINK="$APP_DIR/.current-next"
rm -f "$NEXT_LINK"
ln -s "$TARGET" "$NEXT_LINK"
mv -Tf "$NEXT_LINK" "$CURRENT_LINK"

if ! systemctl restart egshop.service; then
  if [[ -n "$ACTIVE" && -d "$ACTIVE" ]]; then
    ln -sfn "$ACTIVE" "$NEXT_LINK"
    mv -Tf "$NEXT_LINK" "$CURRENT_LINK"
    systemctl restart egshop.service
  fi
  exit 1
fi

HEALTHY=0
for _ in {1..15}; do
  if curl -fsS http://127.0.0.1:3000/ >/dev/null; then
    HEALTHY=1
    break
  fi
  sleep 1
done

if [[ "$HEALTHY" != 1 ]]; then
  if [[ -n "$ACTIVE" && -d "$ACTIVE" ]]; then
    ln -sfn "$ACTIVE" "$NEXT_LINK"
    mv -Tf "$NEXT_LINK" "$CURRENT_LINK"
    systemctl restart egshop.service
  fi
  echo "Health check failed; rolled back." >&2
  exit 1
fi

echo "Deployed $RELEASE_ID"
