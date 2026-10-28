#!/usr/bin/env bash
# Inicia o PingHub em http://localhost:5000 usando PostgreSQL.
set -euo pipefail
cd "$(dirname "$0")"

[ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r requirements.txt

[ -f .env ] || {
  cp .env.example .env
  echo "Criei o .env a partir do .env.example; configure DATABASE_URL e os segredos."
}

# Aceita DATABASE_URL ou o conjunto DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.
if ! grep -qE '^(DATABASE_URL|DB_HOST)=.+' .env; then
  echo "Configure DATABASE_URL (ou DB_HOST/DB_USER/DB_PASSWORD/DB_NAME) para PostgreSQL no .env." >&2
  echo "Sem Docker? Rode ./scripts/dev_db.sh start e use a URL exibida." >&2
  exit 1
fi

export PINGHUB_ENV="${PINGHUB_ENV:-development}"
export FLASK_DEBUG="${FLASK_DEBUG:-1}"
exec .venv/bin/python app.py
