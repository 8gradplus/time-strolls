#!/bin/sh
# Dumps the live database into backups/ next to this script and keeps the
# last 10 dumps. Runs on the droplet: before every deployment (deploy.sh)
# and by hand (make backup-prod). The label goes into the file name.
# Restore: docker exec -i postgres pg_restore -U <admin> -d timestrolls --clean < <file>
set -eu
cd "$(dirname "$0")"

label=${1:-manual}
admin=$(sed -n 's/^POSTGRES_ADMIN=//p' credentials.prod)
mkdir -p backups
file="backups/${label}-$(date +%Y%m%d-%H%M%S).dump"

if ! docker exec postgres pg_dump -U "$admin" -d timestrolls -Fc >"$file" || [ ! -s "$file" ]; then
  rm -f "$file"
  echo "Backup failed" >&2
  exit 1
fi

ls -1t backups/*.dump | tail -n +11 | xargs -r rm --
echo "Backup: $file"
