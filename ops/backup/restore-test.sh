
#!/usr/bin/env bash
set -Eeuo pipefail

: "${TEST_DATABASE_URL:?TEST_DATABASE_URL is required and must point to an empty test database}"
BACKUP_FILE="${1:?Usage: restore-test.sh /path/to/egshop.dump}"

case "$TEST_DATABASE_URL" in
  *localhost*|*127.0.0.1*) ;;
  *)
    if [[ "${ALLOW_REMOTE_RESTORE_TEST:-false}" != "true" ]]; then
      echo "Refusing a remote restore. Set ALLOW_REMOTE_RESTORE_TEST=true only for an isolated test database." >&2
      exit 2
    fi
    ;;
esac

sha256sum --check "$BACKUP_FILE.sha256"
pg_restore --list "$BACKUP_FILE" >/dev/null
pg_restore --dbname="$TEST_DATABASE_URL" --clean --if-exists --no-owner --no-acl "$BACKUP_FILE"

psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
select to_regclass('public.profiles') is not null as profiles_exists;
select to_regclass('public.products') is not null as products_exists;
select to_regclass('public.orders') is not null as orders_exists;
select count(*) >= 0 as profiles_readable from public.profiles;
select count(*) >= 0 as products_readable from public.products;
SQL

echo "Restore smoke test completed successfully."


