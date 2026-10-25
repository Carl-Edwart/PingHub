"""Configuração do Gunicorn para produção (carregada automaticamente: `gunicorn app:app`).

Por que 1 worker + várias threads: o PingHub guarda o limite de tentativas de login na memória do processo.
Com vários workers o limite valeria por worker (5 x N tentativas). Uma instância com threads atende com folga
o volume de um clube e mantém o limite correto. Para escalar, suba WEB_CONCURRENCY ciente dessa troca.
"""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"          # a plataforma injeta PORT
workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
threads = int(os.environ.get("GUNICORN_THREADS", "8"))       # threads > 1 => worker gthread
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "60"))      # > DB_READ_TIMEOUT (30 s)
graceful_timeout = 30
accesslog = "-"                                              # logs em stdout/stderr (coletados pela plataforma)
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info").lower()
