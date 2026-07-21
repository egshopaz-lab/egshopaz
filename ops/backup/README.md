
# EG Shop database backup and restore test

The scripts intentionally require a direct PostgreSQL connection string. Never put the database password in Git.

## Backup

1. Install PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) on the backup host.
2. Set `SUPABASE_DB_URL` from Supabase **Connect → Direct connection**.
3. Run `backup.sh`. The script creates a compressed dump, validates its catalog, writes a SHA-256 checksum and applies retention.

Recommended production schedule: a daily systemd timer, encrypted off-server storage, 14 daily backups and 3 monthly backups.

The included `egshop-db-backup.service` and `.timer` run at 02:30 UTC. Put only
`SUPABASE_DB_URL=...` in `/etc/egshop/backup.env`, set that file to mode `0600`,
then install and enable the units. Do not enable the timer until a manual backup
and isolated restore drill have both succeeded.

## Restore drill

Create an empty isolated PostgreSQL database and set `TEST_DATABASE_URL`. Run:

```sh
./restore-test.sh /var/backups/egshop/egshop-YYYYMMDDTHHMMSSZ.dump
```

The script refuses remote restore targets by default and must never be pointed at the production Supabase database.

