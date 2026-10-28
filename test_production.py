"""Contratos de produção PostgreSQL; cenários isolados sem tocar no .env real."""
import json
import os
import secrets
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
TMP = Path(tempfile.mkdtemp(prefix="pinghub-test-"))
for filename in ("app.py", "index.html", "conteudo.json"):
    shutil.copy(HERE / filename, TMP / filename)

SECRET = secrets.token_urlsafe(48)
ADMIN = secrets.token_urlsafe(24)
DBPASS = "db-" + secrets.token_urlsafe(24)
GOOD = {
    "PINGHUB_ENV": "production",
    "DATABASE_URL": f"postgresql://pinghub_app:{DBPASS}@127.0.0.1:1/pinghub",
    "SECRET_KEY": SECRET,
    "ADMIN_PASSWORD": ADMIN,
    "DB_AUTO_INIT": "0",
    "LOG_LEVEL": "CRITICAL",
}
BASE = {key: os.environ[key] for key in ("PATH", "PYTHONPATH", "HOME", "LANG", "VIRTUAL_ENV") if key in os.environ}
PRELUDE = "import json, app as A\nc=A.app.test_client()\n"
results = []


def run(code, **env):
    full_env = {**BASE, **{key: value for key, value in env.items() if value is not None}}
    return subprocess.run(
        [sys.executable, "-c", "import sys; sys.path.insert(0, %r)\n%s" % (str(TMP), code)],
        cwd=TMP, env=full_env, capture_output=True, text=True, timeout=60,
    )


def run_app(args, **env):
    full_env = {**BASE, **{key: value for key, value in env.items() if value is not None}}
    return subprocess.run(
        [sys.executable, "app.py", *args], cwd=TMP, env=full_env,
        capture_output=True, text=True, timeout=60,
    )


def json_output(result):
    assert result.returncode == 0, f"processo falhou:\n{result.stderr[-1200:]}"
    return json.loads(result.stdout.strip().splitlines()[-1])


def no_secrets(*texts):
    for text in texts:
        for secret in (SECRET, ADMIN, DBPASS):
            assert secret not in text, "um segredo apareceu na saída"


def case(name, test):
    try:
        test()
        results.append((name, True))
        print("ok  ", name)
    except Exception as exc:
        results.append((name, False))
        print("FALHOU", name, "→", repr(exc))


def test_required_config():
    result = run("import app")
    assert result.returncode != 0
    assert all(name in result.stderr for name in ("DATABASE_URL", "SECRET_KEY", "ADMIN_PASSWORD"))
    assert "Configuração inválida" in result.stderr
    no_secrets(result.stdout, result.stderr)


def test_database_url_validation():
    for url in ("mysql://user:pass@localhost/db", "postgresql:///missing-host"):
        result = run("import app", **{**GOOD, "DATABASE_URL": url})
        assert result.returncode != 0, url
    for password in ("pinghub", "pinghub-local-only"):
        weak = run("import app", **{**GOOD, "DATABASE_URL": f"postgresql://user:{password}@localhost:5432/db"})
        assert weak.returncode != 0 and "DATABASE_URL" in weak.stderr, password


def test_secret_validation():
    weak = run("import app", **{
        **GOOD, "SECRET_KEY": "replace-with-a-random-secret",
        "ADMIN_PASSWORD": "replace-with-a-strong-password",
    })
    assert weak.returncode != 0 and "SECRET_KEY" in weak.stderr and "ADMIN_PASSWORD" in weak.stderr
    same = secrets.token_urlsafe(48)
    result = run("import app", **{**GOOD, "SECRET_KEY": same, "ADMIN_PASSWORD": same})
    assert result.returncode != 0 and "diferentes" in result.stderr


def test_numeric_config():
    result = run("import app", **{
        **GOOD, "PORT": "99999", "DB_PORT": "0", "DB_CONNECT_TIMEOUT": "invalid",
    })
    assert result.returncode != 0
    assert all(name in result.stderr for name in ("PORT", "DB_PORT", "DB_CONNECT_TIMEOUT"))


def test_valid_config_and_local_defaults():
    result = run("import app; print('importou')", **GOOD)
    assert result.returncode == 0 and "importou" in result.stdout, result.stderr[-700:]
    no_secrets(result.stdout, result.stderr)
    local = run(
        "import json, app as A; from urllib.parse import urlsplit; p=urlsplit(A._database_url()); "
        "print(json.dumps([p.hostname,p.port,p.path.strip('/')]))",
        PINGHUB_ENV="development",
    )
    assert json_output(local) == ["127.0.0.1", 5432, "pinghub"]


def test_dotenv_and_connection_timeout():
    env_file = TMP / ".env"
    env_file.write_text("DATABASE_URL=postgresql://dotenv:dotenv@dotenv-host:5432/dotenv\n")
    try:
        result = run(
            "import json, app as A; from urllib.parse import urlsplit; "
            "print(json.dumps(urlsplit(A._database_url()).hostname))",
            **GOOD,
        )
    finally:
        env_file.unlink(missing_ok=True)
    assert json_output(result) == "127.0.0.1"
    timeout = run(
        "import json, app as A; A.psycopg.connect=lambda *a,**k: (a,k); "
        "a,k=A._connect(); print(json.dumps([k['connect_timeout'],a[0].startswith('postgresql://')]))",
        **{**GOOD, "DB_CONNECT_TIMEOUT": "7"},
    )
    assert json_output(timeout) == [7, True]


def test_cli_and_init_db_errors():
    result = run_app([], **GOOD)
    assert result.returncode != 0 and "gunicorn" in result.stdout + result.stderr
    result = run_app(["init-db"], **GOOD)
    assert result.returncode != 0
    no_secrets(result.stdout, result.stderr)


def test_health_routes():
    result = json_output(run(
        PRELUDE + "r=c.get('/health'); print(json.dumps([r.status_code,r.get_json()]))",
        **GOOD,
    ))
    assert result == [200, {"status": "ok"}]
    status, body = json_output(run(
        PRELUDE + "r=c.get('/health/db'); print(json.dumps([r.status_code,r.get_data(as_text=True)]))",
        **GOOD,
    ))
    assert status == 503 and "127.0.0.1" not in body and DBPASS not in body


def test_api_db_unavailable():
    result = json_output(run(
        PRELUDE + "o=[]\nfor p in ('/api/mesa','/api/matches?limit=5','/api/stats','/api/ranking'):\n"
        " r=c.get(p); o.append([p,r.status_code,r.get_data(as_text=True)])\nprint(json.dumps(o))",
        **GOOD,
    ))
    expected = {"error": "Banco de dados indisponível no momento. Tente novamente."}
    assert all(status == 503 and json.loads(body) == expected and DBPASS not in body
               for _, status, body in result), result
    no_secrets(json.dumps(result))


def test_unexpected_errors_and_commit_failure():
    result = run(
        PRELUDE + "@A.app.get('/crash')\ndef crash(): raise RuntimeError('detalhe-interno-secreto')\n"
        "r=c.get('/crash'); print(json.dumps([r.status_code,r.get_json()]))",
        **{**GOOD, "LOG_LEVEL": "DEBUG"},
    )
    assert json_output(result) == [500, {"error": "Erro interno do servidor"}]
    assert "detalhe-interno-secreto" in result.stdout + result.stderr
    committed = json_output(run(
        PRELUDE + "from flask import g, jsonify\nclass DB:\n"
        " rolled=False\n def commit(self): raise A.psycopg.OperationalError('lost connection')\n"
        " def rollback(self): DB.rolled=True\n def close(self): pass\n"
        "@A.app.post('/fake-write')\ndef write(): g.db=DB(); return jsonify(ok=True),201\n"
        "r=c.post('/fake-write',json={}); print(json.dumps([r.status_code,DB.rolled]))",
        **GOOD,
    ))
    assert committed == [503, True]


def test_files_and_headers():
    result = json_output(run(
        PRELUDE + "o={}\nfor p in ('/','/.env','/app.py','/conteudo.json','/test_production.py','/.git/config','/api/../.env'):\n"
        " r=c.get(p); o[p]=[r.status_code,'SECRET' in r.get_data(as_text=True)]\nprint(json.dumps(o))",
        **GOOD,
    ))
    assert result["/"][0] == 200
    assert all(status == 404 and not leaked for path, (status, leaked) in result.items() if path != "/")
    headers = json_output(run(
        PRELUDE + "a=c.get('/health').headers\nb=c.get('/health',headers={'X-Forwarded-Proto':'https'}).headers\n"
        "print(json.dumps([a.get('X-Content-Type-Options'),a.get('X-Frame-Options'),"
        "a.get('Strict-Transport-Security'),b.get('Strict-Transport-Security')]))",
        **{**GOOD, "TRUSTED_PROXY_COUNT": "1"},
    ))
    assert headers == ["nosniff", "SAMEORIGIN", None, "max-age=31536000"]


def test_request_validation():
    large = json_output(run(
        PRELUDE + "r=c.post('/api/matches',data=' '*1_200_000,content_type='application/json'); "
        "print(json.dumps(r.status_code))",
        **GOOD,
    ))
    assert large == 413
    statuses = json_output(run(
        PRELUDE + "o=[]\nfor body in ('[1,2]','\"txt\"','123','null','{'):\n"
        " r=c.post('/api/matches',data=body,content_type='application/json'); o.append(r.status_code)\n"
        "print(json.dumps(o))",
        **GOOD,
    ))
    assert statuses == [400] * 5


def test_admin_auth_and_rate_limit():
    result = json_output(run(
        PRELUDE + "o=[]\nfor m,p in (('post','/api/athletes'),('put','/api/athletes/1'),"
        "('delete','/api/athletes/1'),('post','/api/tournaments'),('delete','/api/tournaments/1')):\n"
        " o.append(getattr(c,m)(p,json={}).status_code); "
        "o.append(getattr(c,m)(p,json={},headers={'X-Admin-Token':'lixo'}).status_code)\n"
        "t=c.post('/api/admin/login',json={'password':A.os.environ['ADMIN_PASSWORD']}).get_json()['token']\n"
        "o.extend([c.get('/api/admin/check',headers={'X-Admin-Token':t}).get_json()['admin'],"
        "c.get('/api/admin/check',headers={'X-Admin-Token':t[:-2]+'xx'}).get_json()['admin'],"
        "c.get('/api/admin/check').get_json()['admin']])\nprint(json.dumps(o))",
        **GOOD,
    ))
    assert result[:10] == [401] * 10 and result[10:] == [True, False, False]
    limited = json_output(run(
        PRELUDE + "o=[c.post('/api/admin/login',json={'password':'errada'}).status_code for _ in range(5)]\n"
        "o.append(c.post('/api/admin/login',json={'password':A.os.environ['ADMIN_PASSWORD']}).status_code)\n"
        "print(json.dumps(o))",
        **GOOD,
    ))
    assert limited == [401] * 5 + [429]


def test_proxy_rate_limit_and_password_logging():
    code = (
        PRELUDE + "def bad(ip): return c.post('/api/admin/login',json={'password':'errada'},"
        "headers={'X-Forwarded-For':ip}).status_code\n"
        "a=[bad('1.1.1.1') for _ in range(6)]; b=bad('2.2.2.2'); print(json.dumps([a,b]))"
    )
    trusted = json_output(run(code, **{**GOOD, "TRUSTED_PROXY_COUNT": "1"}))
    untrusted = json_output(run(code, **GOOD))
    assert trusted == [[401] * 5 + [429], 401]
    assert untrusted == [[401] * 5 + [429], 429]
    result = run(
        PRELUDE + "c.post('/api/admin/login',json={'password':'tentativa-super-secreta-999'}); print('feito')",
        **{**GOOD, "LOG_LEVEL": "DEBUG"},
    )
    assert "tentativa-super-secreta-999" not in result.stdout + result.stderr


def test_csv_and_schema():
    result = json_output(run(
        "import json,app as A; print(json.dumps([A._cell('=1+1'),A._cell('+55'),A._cell('@SUM(A1)'),"
        "A._cell('-1+2'),A._cell('Maria'),A._cell(1500),A._cell(-1)]))",
        **GOOD,
    ))
    assert result == ["'=1+1", "'+55", "'@SUM(A1)", "'-1+2", "Maria", 1500, -1]
    schema = json_output(run(
        "import json,app as A; s=A.SCHEMA.upper()+str(A.MIGRATIONS).upper()+A.SQL.upper(); "
        "print(json.dumps(['SERIAL' in s and 'CREATE TABLE' in s,'AUTO_INCREMENT' in s,"
        "'DROP TABLE' in s,'INTERVAL 7 DAY' in s]))",
        **GOOD,
    ))
    assert schema == [True, False, False, False]


def test_gunicorn_config():
    result = json_output(run(
        f"import json; ns={{}}; exec(open({str(HERE / 'gunicorn.conf.py')!r}).read(),ns); "
        "print(json.dumps([ns['bind'],ns['accesslog'],ns['errorlog'],ns['workers'],ns['threads']]))",
        PORT="8123",
    ))
    assert result == ["0.0.0.0:8123", "-", "-", 1, 8]


for name, test in (
    ("produção exige PostgreSQL e segredos fortes", test_required_config),
    ("rejeita URL MySQL, URLs inválidas e senha fraca", test_database_url_validation),
    ("rejeita placeholders e segredo administrativo repetido", test_secret_validation),
    ("valida configurações numéricas", test_numeric_config),
    ("configuração de produção e defaults locais", test_valid_config_and_local_defaults),
    ("dotenv não sobrescreve ambiente e conexão usa timeout", test_dotenv_and_connection_timeout),
    ("CLI e init-db não expõem credenciais", test_cli_and_init_db_errors),
    ("health checks e indisponibilidade do banco", test_health_routes),
    ("API retorna erro genérico sem banco", test_api_db_unavailable),
    ("erros internos e falha de commit", test_unexpected_errors_and_commit_failure),
    ("arquivos internos e cabeçalhos HTTP", test_files_and_headers),
    ("limite de payload e validação JSON", test_request_validation),
    ("autenticação admin e limite de tentativas", test_admin_auth_and_rate_limit),
    ("proxy confiável e proteção da senha de login", test_proxy_rate_limit_and_password_logging),
    ("neutralização CSV e contrato do esquema PostgreSQL", test_csv_and_schema),
    ("configuração do Gunicorn", test_gunicorn_config),
):
    case(name, test)

shutil.rmtree(TMP)
failed = [name for name, passed in results if not passed]
print(f"\n{len(results) - len(failed)}/{len(results)} contratos passaram")
sys.exit(1 if failed else 0)
