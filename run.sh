#!/usr/bin/env bash
# Inicia o PingHub em http://localhost:5000 para DESENVOLVIMENTO (usa o MySQL configurado no .env).
# Produção NÃO usa este script: veja DEPLOY.md (gunicorn app:app).
set -euo pipefail
cd "$(dirname "$0")"
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -r requirements.txt; }
[ -f .env ] || { cp .env.example .env; echo "Criei o .env a partir do .env.example — confira usuário/senha do MySQL e defina ADMIN_PASSWORD/SECRET_KEY."; }
export PINGHUB_ENV="${PINGHUB_ENV:-development}"
export FLASK_DEBUG="${FLASK_DEBUG:-1}"
exec .venv/bin/python app.py
