#!/usr/bin/env bash
# Inicia o PingHub em http://localhost:5000 (usa o MySQL configurado no .env).
set -euo pipefail
cd "$(dirname "$0")"
[ -d .venv ] || { python3 -m venv .venv && .venv/bin/pip install -r requirements.txt; }
[ -f .env ] || { cp .env.example .env; echo "Criei o .env a partir do .env.example — confira usuário/senha do MySQL."; }
exec .venv/bin/python app.py
