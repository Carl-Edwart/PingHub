"""Configuração do Gunicorn para produção (carregada automaticamente: `gunicorn app:app`).

Cada worker importa `app` e aplica o schema no boot (DB_INIT_ON_START=1). O advisory lock
transacional serializa workers e reinícios, então não é preciso uma requisição HTTP nem criar
tabelas manualmente. O `scripts/start.sh` ainda roda `init-db` antes, com retries para banco lento.

Por que 1 worker + várias threads: o PingHub guarda o limite de tentativas de login na memória do processo.
Com vários workers o limite valeria por worker (5 x N tentativas). Uma instância com threads atende com folga
o volume de um clube e mantém o limite correto. Para escalar, suba WEB_CONCURRENCY ciente dessa troca.
"""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"          # a plataforma injeta PORT
workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
threads = int(os.environ.get("GUNICORN_THREADS", "8"))       # threads > 1 => worker gthread
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "60"))      # acima do tempo de conexão com o banco
graceful_timeout = 30
accesslog = "-"                                              # logs em stdout/stderr (coletados pela plataforma)
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info").lower()
