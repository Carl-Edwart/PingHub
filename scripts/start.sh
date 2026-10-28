#!/usr/bin/env bash
# Script de inicialização usado em produção (Render/Railway).
# O init-db é idempotente: cria/atualiza o esquema sem apagar dados.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

PYTHON="${PYTHON:-$(command -v python || command -v python3)}"
command -v gunicorn >/dev/null || {
  echo "gunicorn não encontrado; instale as dependências de requirements.txt." >&2
  exit 1
}

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if "$PYTHON" app.py init-db; then
    break
  fi
  if [[ "$attempt" -eq 10 ]]; then
    echo "Não foi possível inicializar o PostgreSQL após 10 tentativas." >&2
    exit 1
  fi
  echo "Banco indisponível (tentativa $attempt/10); aguardando 3 s..." >&2
  sleep 3
done

exec gunicorn app:app
