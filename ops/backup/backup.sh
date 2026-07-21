
#!/usr/bin/env bash
set -Eeuo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/egshop}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/egshop-$STAMP.dump"

install -d -m 0700 "$BACKUP_DIR"
umask 077
pg_dump --dbname="$SUPABASE_DB_URL" --format=custom --compress=9 --no-owner --no-acl --file="$TARGET"
pg_restore --list "$TARGET" >/dev/null
sha256sum "$TARGET" >"$TARGET.sha256"
find "$BACKUP_DIR" -type f -name 'egshop-*.dump*' -mtime "+$RETENTION_DAYS" -delete
printf 'Backup verified: %s\n' "$TARGET"


