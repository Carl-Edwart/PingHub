#!/usr/bin/env bash
# Verificação rápida de um ambiente já publicado.
# Uso: ./scripts/smoke_test.sh https://pinghub.onrender.com
set -Eeuo pipefail

BASE="${1:-${PINGHUB_URL:-http://127.0.0.1:8000}}"
BASE="${BASE%/}"

for path in /health /health/db /api/stats; do
  printf '%-12s ' "$path"
  if curl -fsS --max-time 20 "$BASE$path" >/dev/null; then
    echo "ok"
  else
    echo "FALHOU"
    exit 1
  fi
done

echo "Smoke test OK: $BASE"
