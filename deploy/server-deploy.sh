#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR=/var/www/eg-shop
APP_DIR=/var/www/egshop
RELEASES_DIR="$APP_DIR/releases"
CURRENT_LINK="$APP_DIR/current"
BUILD_HOME="$APP_DIR/.build-home"
NPM_CACHE="$APP_DIR/.npm-cache"
ENV_FILE=/etc/egshop/egshop.env
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

if [[ "$ACTIVE" == "$TARGET" && -f "$TARGET/.deploy-complete" ]]; then
  echo "EG Shop is already on $RELEASE_ID"
  exit 0
fi

install -d -o egshop -g egshop "$RELEASES_DIR"
install -d -o egshop -g egshop "$BUILD_HOME"
install -d -o egshop -g egshop "$NPM_CACHE"

STAGING=""
cleanup() {
  if [[ -n "$STAGING" && "$STAGING" == "$RELEASES_DIR/.build-$RELEASE_ID-"* ]]; then
    rm -rf -- "$STAGING"
  fi
}
trap cleanup EXIT

if [[ ! -f "$TARGET/.deploy-complete" ]]; then
  if [[ -e "$TARGET" ]]; then
    FAILED_TARGET="$TARGET.failed-$(date -u +%Y%m%dT%H%M%SZ)"
    mv "$TARGET" "$FAILED_TARGET"
    echo "Moved incomplete release to $FAILED_TARGET"
  fi

  STAGING="$(mktemp -d "$RELEASES_DIR/.build-$RELEASE_ID-XXXXXX")"
  chown egshop:egshop "$STAGING"
  git archive "$SHA" | tar -x -C "$STAGING"
  chown -R egshop:egshop "$STAGING"

  if [[ ! -r "$ENV_FILE" ]]; then
    echo "Missing build environment: $ENV_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  runuser -u egshop --preserve-environment -- env     HOME="$BUILD_HOME"     npm_config_cache="$NPM_CACHE"     PATH=/usr/local/bin:/usr/bin:/bin     bash -c 'cd "$1" && npm install --no-audit --no-fund && npm run build && npm run typecheck'     _ "$STAGING"

  printf '%s\n' "$SHA" >"$STAGING/.deploy-complete"
  chown egshop:egshop "$STAGING/.deploy-complete"
  mv "$STAGING" "$TARGET"
  STAGING=""
fi

if [[ ! -f "$TARGET/.deploy-complete" || ! -f "$TARGET/.output/server/index.mjs" ]]; then
  echo "Release validation failed for $RELEASE_ID" >&2
  exit 1
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
for _ in {1..60}; do
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
