#!/usr/bin/env sh
set -eu
umask 077
: "${DATABASE_URL:?Set DATABASE_URL in the backup process environment}"
studio_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
studio_backup="${BACKUP_DIR:-$studio_root/backups}"
mkdir -p "$studio_backup"
studio_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump --dbname="$DATABASE_URL" -Fc --file="$studio_backup/database-$studio_stamp.dump"
tar -C "$studio_root" -czf "$studio_backup/files-$studio_stamp.tar.gz" uploads render-output .secrets
printf 'Backed up database, uploaded assets, renders and credential encryption key.\n'
printf 'Copy backups to separate private storage and test restoration.\n'
