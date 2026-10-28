#!/usr/bin/env bash
# PostgreSQL local sem Docker, para desenvolvimento.
# Uso: ./scripts/dev_db.sh [start|stop|status]
# O cluster fica fora do repositório, em ~/.local/share/pinghub/postgresql.
set -Eeuo pipefail

ACTION="${1:-start}"
DATA_DIR="${PINGHUB_PGDATA:-$HOME/.local/share/pinghub/postgresql}"
PORT="${PINGHUB_PGPORT:-55433}"
DB_NAME="${PINGHUB_DB_NAME:-pinghub}"
DB_USER="${PINGHUB_DB_USER:-postgres}"

PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || true)")}"
if [[ ! -x "$PGBIN/pg_ctl" ]]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
fi
[[ -x "$PGBIN/initdb" ]] || { echo "PostgreSQL não encontrado. Instale postgresql (servidor) ou use Docker." >&2; exit 1; }

start() {
  if [[ ! -f "$DATA_DIR/PG_VERSION" ]]; then
    mkdir -p "$DATA_DIR"
    echo "Criando cluster PostgreSQL em $DATA_DIR..."
    "$PGBIN/initdb" -D "$DATA_DIR" -U "$DB_USER" --auth=trust --no-locale -E UTF8 >/dev/null
  fi
  if ! "$PGBIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
    echo "Iniciando PostgreSQL na porta $PORT (somente 127.0.0.1)..."
    "$PGBIN/pg_ctl" -D "$DATA_DIR" \
      -o "-p $PORT -k $DATA_DIR -c listen_addresses=127.0.0.1" \
      -l "$DATA_DIR/server.log" start >/dev/null
  fi
  if ! "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d postgres -tAc \
       "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    "$PGBIN/createdb" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" "$DB_NAME"
  fi
  echo "PostgreSQL pronto."
  echo "DATABASE_URL=postgresql://$DB_USER@127.0.0.1:$PORT/$DB_NAME"
}

stop() {
  if [[ -f "$DATA_DIR/PG_VERSION" ]] && "$PGBIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
    "$PGBIN/pg_ctl" -D "$DATA_DIR" stop -m fast >/dev/null
    echo "PostgreSQL parado."
  else
    echo "PostgreSQL já está parado."
  fi
}

status() {
  "$PGBIN/pg_ctl" -D "$DATA_DIR" status || true
  echo "DATABASE_URL=postgresql://$DB_USER@127.0.0.1:$PORT/$DB_NAME"
}

case "$ACTION" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) echo "Uso: $0 [start|stop|status]" >&2; exit 2 ;;
esac
