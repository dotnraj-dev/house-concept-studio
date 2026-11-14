#!/usr/bin/env sh
set -eu
umask 077
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
docker compose exec -T db pg_dump -U house -d house_studio -Fc > "$BACKUP_DIR/database-$STAMP.dump"
docker compose exec -T app tar -C /app -czf - uploads > "$BACKUP_DIR/uploads-$STAMP.tar.gz"
echo "Created database and upload backups in $BACKUP_DIR"
echo "Copy them to separate storage; files left on the VPS are not an off-site backup."
