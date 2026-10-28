#!/usr/bin/env bash
set -Eeuo pipefail
if [[ -f .env ]]; then set -a; source .env; set +a; fi
: "${DATABASE_URL:?Configure DATABASE_URL no ambiente ou no arquivo .env}"
command -v pg_restore >/dev/null || { echo "Erro: instale postgresql-client (pg_restore)." >&2; exit 1; }
FILE="${1:-}"
[[ -n "$FILE" && -f "$FILE" ]] || { echo "Uso: $0 caminho/backup.dump" >&2; exit 2; }
echo "ATENÇÃO: a restauração pode sobrescrever objetos existentes no banco de destino."
read -r -p "Digite RESTAURAR para continuar: " CONFIRM
[[ "$CONFIRM" == "RESTAURAR" ]] || { echo "Cancelado."; exit 1; }
pg_restore --verbose --clean --if-exists --no-owner --no-privileges --dbname "$DATABASE_URL" "$FILE"
echo "Restauração concluída. Confira os dados no aplicativo."
