#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [[ -f .env ]]; then set -a; source .env; set +a; fi
: "${DATABASE_URL:?Configure DATABASE_URL no ambiente ou no arquivo .env}"
command -v pg_dump >/dev/null || { echo "Erro: instale postgresql-client (pg_dump)." >&2; exit 1; }
OUTDIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUTDIR"
chmod 700 "$OUTDIR"
FILE="$OUTDIR/pinghub-$(date +%Y%m%d-%H%M%S).dump"
umask 077
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" --file "$FILE"
pg_restore --list "$FILE" >/dev/null
echo "Backup verificado: $FILE"
