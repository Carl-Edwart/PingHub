"""Testes de produção do PingHub (sem MySQL): configuração, autenticação, health, falhas de banco e vazamento de dados.

Cada cenário roda num subprocesso, numa CÓPIA do projeto sem `.env` (nunca lê o seu .env real).
Rodar:  python test_production.py
Os testes que dependem de um MySQL/MariaDB real NÃO estão aqui — veja a seção "Testes de integração" do DEPLOY.md.
"""
import json, os, secrets, shutil, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
TMP = Path(tempfile.mkdtemp(prefix="pinghub-test-"))
for f in ("app.py", "index.html", "conteudo.json"):
    shutil.copy(HERE / f, TMP / f)

SECRET = secrets.token_urlsafe(48)
ADMIN = secrets.token_urlsafe(18)
DBPASS = "bd-" + secrets.token_urlsafe(18)
GOOD = dict(PINGHUB_ENV="production", DB_HOST="127.0.0.1", DB_PORT="1", DB_USER="pinghub_app", DB_PASSWORD=DBPASS,
            DB_NAME="pinghub", SECRET_KEY=SECRET, ADMIN_PASSWORD=ADMIN, DB_AUTO_INIT="0", LOG_LEVEL="CRITICAL")
BASE = {k: os.environ[k] for k in ("PATH", "PYTHONPATH", "HOME", "LANG", "VIRTUAL_ENV") if k in os.environ}


def run(code, **env):
    full = {**BASE, **{k: v for k, v in env.items() if v is not None}}
    r = subprocess.run([sys.executable, "-c", "import sys; sys.path.insert(0, %r)\n%s" % (str(TMP), code)],
                       cwd=TMP, env=full, capture_output=True, text=True, timeout=60)
    return r


def run_app(args, **env):
    full = {**BASE, **{k: v for k, v in env.items() if v is not None}}
    return subprocess.run([sys.executable, "app.py", *args], cwd=TMP, env=full, capture_output=True, text=True, timeout=60)


def jout(r):
    assert r.returncode == 0, f"processo falhou (rc={r.returncode}):\n{r.stderr[-1500:]}"
    return json.loads(r.stdout.strip().splitlines()[-1])


def no_secrets(*texts):
    for t in texts:
        for v in (SECRET, ADMIN, DBPASS):
            assert v not in t, "VAZAMENTO de segredo na saída!"


results = []


def case(name):
    def deco(fn):
        try:
            fn()
            results.append((name, "OK", ""))
            print("ok  ", name)
        except AssertionError as e:
            results.append((name, "FALHOU", str(e)))
            print("FALHOU", name, "→", e)
        except Exception as e:  # erro inesperado no próprio teste
            results.append((name, "ERRO", repr(e)))
            print("ERRO ", name, "→", repr(e))
        return fn
    return deco


# ---------------------------------------------------------------- configuração
@case("produção sem nenhuma variável: falha com mensagem clara, listando só nomes")
def _():
    r = run("import app", PINGHUB_ENV="production")
    assert r.returncode != 0
    for name in ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "SECRET_KEY", "ADMIN_PASSWORD"):
        assert name in r.stderr, name
    assert "Configuração inválida" in r.stderr


@case("PINGHUB_ENV ausente é tratado como produção (padrão seguro)")
def _():
    r = run("import app")          # sem PINGHUB_ENV e sem nada
    assert r.returncode != 0 and "SECRET_KEY" in r.stderr


@case("produção rejeita SECRET_KEY curta, senha admin fraca e DB_PASSWORD de exemplo")
def _():
    r = run("import app", **{**GOOD, "SECRET_KEY": "curta", "ADMIN_PASSWORD": "troque-esta-senha", "DB_PASSWORD": "pinghub"})
    assert r.returncode != 0
    assert "SECRET_KEY" in r.stderr and "ADMIN_PASSWORD" in r.stderr and "DB_PASSWORD" in r.stderr
    assert "troque-esta-senha" not in r.stderr.split("ConfigError")[-1], "valor da senha apareceu na mensagem"


@case("produção rejeita os placeholders do .env.example (mesmo com tamanho suficiente)")
def _():
    r = run("import app", **{**GOOD, "SECRET_KEY": "troque-por-um-segredo-aleatorio-com-bastante-tamanho-123",
                              "ADMIN_PASSWORD": "troque-por-uma-senha-forte", "DB_PASSWORD": "defina-a-senha-do-usuario-do-banco"})
    assert r.returncode != 0
    for name in ("SECRET_KEY", "ADMIN_PASSWORD", "DB_PASSWORD"):
        assert name in r.stderr, name


@case("produção rejeita SECRET_KEY igual à senha admin")
def _():
    same = secrets.token_urlsafe(40)
    r = run("import app", **{**GOOD, "SECRET_KEY": same, "ADMIN_PASSWORD": same})
    assert r.returncode != 0 and "diferentes" in r.stderr


@case("DB_PASSWORD vazia não é aceita como fallback em produção")
def _():
    r = run("import app", **{**GOOD, "DB_PASSWORD": ""})
    assert r.returncode != 0 and "DB_PASSWORD" in r.stderr


@case("valores numéricos inválidos (PORT, DB_PORT) falham com mensagem clara")
def _():
    r = run("import app", **{**GOOD, "DB_PORT": "abc", "PORT": "99999"})
    assert r.returncode != 0 and "DB_PORT" in r.stderr and "PORT" in r.stderr


@case("configuração válida de produção inicia e não imprime segredos")
def _():
    r = run("import app; print('importou')", **GOOD)
    assert r.returncode == 0 and "importou" in r.stdout, r.stderr[-800:]
    no_secrets(r.stdout, r.stderr)


@case("desenvolvimento aceita os padrões locais (127.0.0.1/root) — mas só em desenvolvimento")
def _():
    r = run("import app; p=app._params(); print(p['host'], p['user'], repr(p['password']))",
            PINGHUB_ENV="development", ADMIN_PASSWORD="x", SECRET_KEY="y")
    assert r.returncode == 0 and r.stdout.split() == ["127.0.0.1", "root", "''"], r.stderr[-500:]


@case("variáveis definidas pela plataforma não são sobrescritas por um .env")
def _():
    (TMP / ".env").write_text("DB_HOST=host-do-dotenv\nDB_NAME=nome-do-dotenv\n")
    try:
        r = run("import app; p=app._params(); print(p['host'], p['database'])", **{**GOOD, "DB_HOST": "host-da-plataforma"})
        assert r.stdout.split() == ["host-da-plataforma", "pinghub"], (r.stdout, r.stderr[-400:])
    finally:
        (TMP / ".env").unlink()


@case("conexão usa timeouts (connect/read/write) — não trava indefinidamente")
def _():
    r = run("import app; p=app._params(); print(p['connect_timeout'], p['read_timeout'], p['write_timeout'])", **GOOD)
    assert r.stdout.split() == ["10", "30", "30"], r.stderr[-400:]


# ---------------------------------------------------------------- servidor / CLI
@case("`python app.py` (servidor de desenvolvimento) é recusado em produção")
def _():
    r = run_app([], **GOOD)
    assert r.returncode != 0 and "gunicorn" in (r.stderr + r.stdout)


@case("`init-db` com banco inacessível falha com erro e sem expor a senha")
def _():
    r = run_app(["init-db"], **GOOD)
    assert r.returncode != 0
    no_secrets(r.stdout, r.stderr)


# ---------------------------------------------------------------- health / erros / vazamento
APP_PRELUDE = "import json, app as A\nc = A.app.test_client()\n"


@case("/health responde 200 sem tocar no banco (mesmo com o banco fora do ar)")
def _():
    o = jout(run(APP_PRELUDE + "r=c.get('/health'); print(json.dumps([r.status_code, r.get_json()]))", **GOOD))
    assert o == [200, {"status": "ok"}], o


@case("/health/db com banco fora do ar: 503 genérico, sem host/usuário/senha")
def _():
    r = run(APP_PRELUDE + "r=c.get('/health/db'); print(json.dumps([r.status_code, r.get_data(as_text=True)]))", **GOOD)
    code, body = jout(r)
    assert code == 503, code
    for leak in ("127.0.0.1", "pinghub_app", DBPASS, "Connection refused", "Traceback"):
        assert leak not in body, f"vazou: {leak}"
    no_secrets(r.stdout, r.stderr)


@case("rota da API com banco fora do ar: 503 JSON genérico, sem detalhes internos")
def _():
    code = APP_PRELUDE + ("outs=[]\nfor path in ('/api/mesa','/api/matches?limit=5','/api/stats','/api/ranking'):\n"
                          "    r=c.get(path); outs.append([path, r.status_code, r.get_data(as_text=True)])\nprint(json.dumps(outs))")
    r = run(code, **GOOD)
    for path, status, body in jout(r):
        assert status == 503, (path, status)
        assert json.loads(body) == {"error": "Banco de dados indisponível no momento. Tente novamente."}, body
        for leak in ("127.0.0.1", "pinghub_app", DBPASS, "Traceback", "pymysql"):
            assert leak not in body, f"{path} vazou: {leak}"
    no_secrets(r.stdout, r.stderr)


@case("exceção inesperada: 500 genérico ao usuário, stack trace só no log")
def _():
    code = APP_PRELUDE.replace("c = A.app.test_client()", "") + (
        "@A.app.get('/boom')\ndef boom():\n    raise ValueError('detalhe-interno-secreto')\n"
        "c = A.app.test_client()\nr=c.get('/boom')\nprint(json.dumps([r.status_code, r.get_data(as_text=True)]))")
    r = run(code, **{**GOOD, "LOG_LEVEL": "ERROR"})
    status, body = jout(r)
    assert status == 500 and "detalhe-interno-secreto" not in body and "Traceback" not in body, body
    assert "detalhe-interno-secreto" in (r.stdout + r.stderr), "o erro real deveria estar no log"


@case("COMMIT que falha NÃO devolve sucesso: resposta vira 503 e é desfeita")
def _():
    code = ("import json, app as A, pymysql\nfrom flask import g, jsonify\n"
            "class FakeDB:\n    rolled=False\n    def commit(self): raise pymysql.err.OperationalError(2013, 'Lost connection')\n"
            "    def rollback(self): FakeDB.rolled=True\n    def close(self): pass\n"
            "@A.app.post('/fake-write')\ndef w():\n    g.db = FakeDB()\n    return jsonify(ok=True), 201\n"
            "r=A.app.test_client().post('/fake-write')\nprint(json.dumps([r.status_code, FakeDB.rolled, r.get_data(as_text=True)]))")
    status, rolled, body = jout(run(code, **GOOD))
    assert status == 503 and rolled is True, (status, rolled, body)


@case("página inicial é servida; .env, app.py e arquivos internos NÃO são expostos")
def _():
    (TMP / ".env").write_text("SEGREDO=1\n")
    try:
        code = APP_PRELUDE + ("o={}\nfor p in ('/','/.env','/app.py','/conteudo.json','/test_production.py','/.git/config','/api/../.env'):\n"
                              "    r=c.get(p); o[p]=[r.status_code, 'SEGREDO' in r.get_data(as_text=True)]\nprint(json.dumps(o))")
        o = jout(run(code, **GOOD))
        assert o["/"][0] == 200
        for p, (status, leaked) in o.items():
            assert not leaked, p
            if p != "/":
                assert status == 404, (p, status)
    finally:
        (TMP / ".env").unlink()


@case("cabeçalhos de segurança presentes; HSTS só quando a requisição é HTTPS (atrás de proxy confiável)")
def _():
    code = APP_PRELUDE + ("a=c.get('/health').headers\nb=c.get('/health', headers={'X-Forwarded-Proto':'https'}).headers\n"
                          "print(json.dumps([a.get('X-Content-Type-Options'), a.get('X-Frame-Options'), a.get('Strict-Transport-Security'),"
                          " b.get('Strict-Transport-Security')]))")
    o = jout(run(code, **{**GOOD, "TRUSTED_PROXY_COUNT": "1"}))
    assert o[0] == "nosniff" and o[1] == "SAMEORIGIN" and o[2] is None and o[3], o


@case("corpo acima de 1 MiB é recusado com 413")
def _():
    code = APP_PRELUDE + "r=c.post('/api/matches', data='x'*1_200_000, content_type='application/json')\nprint(json.dumps(r.status_code))"
    assert jout(run(code, **GOOD)) == 413


@case("JSON que não é objeto (lista/texto) vira 400, não 500")
def _():
    code = APP_PRELUDE + ("o=[]\nfor body in ('[1,2]', '\"txt\"', '123'):\n"
                          "    r=c.post('/api/matches', data=body, content_type='application/json'); o.append(r.status_code)\n"
                          "r=c.post('/api/matches', json={'player1': 'x', 'player2': {'athlete_id': [1]}}); o.append(r.status_code)\n"
                          "r=c.post('/api/matches', json={'player1': {'athlete_id': {'a':1}}, 'player2': {'name':'b'}}); o.append(r.status_code)\n"
                          "print(json.dumps(o))")
    assert jout(run(code, **GOOD)) == [400] * 5, "entradas malformadas deveriam dar 400"


# ---------------------------------------------------------------- autenticação / admin
@case("rotas administrativas exigem token: sem token, token inválido e token adulterado → 401")
def _():
    code = APP_PRELUDE + (
        "o=[]\nfor m,p in (('post','/api/athletes'),('put','/api/athletes/1'),('delete','/api/athletes/1'),('post','/api/tournaments'),('delete','/api/tournaments/1')):\n"
        "    o.append(getattr(c,m)(p, json={}).status_code)\n"
        "    o.append(getattr(c,m)(p, json={}, headers={'X-Admin-Token':'lixo'}).status_code)\n"
        "tok=c.post('/api/admin/login', json={'password': A.os.environ['ADMIN_PASSWORD']}).get_json()['token']\n"
        "o.append(c.get('/api/admin/check', headers={'X-Admin-Token': tok}).get_json()['admin'])\n"
        "o.append(c.get('/api/admin/check', headers={'X-Admin-Token': tok[:-2]+'xx'}).get_json()['admin'])\n"
        "o.append(c.get('/api/admin/check').get_json()['admin'])\nprint(json.dumps(o))")
    o = jout(run(code, **GOOD))
    assert o[:10] == [401] * 10 and o[10:] == [True, False, False], o


@case("token assinado com OUTRA SECRET_KEY é rejeitado; token expirado é rejeitado")
def _():
    code = APP_PRELUDE + (
        "from itsdangerous import URLSafeTimedSerializer as S\n"
        "bad=S('outra-chave-'*5, salt='pinghub-admin').dumps({'role':'admin'})\n"
        "good=S(A.os.environ['SECRET_KEY'], salt='pinghub-admin').dumps({'role':'admin'})\n"
        "A.ADMIN_TOKEN_AGE = -1   # simula expiração\n"
        "print(json.dumps([c.get('/api/admin/check', headers={'X-Admin-Token': bad}).get_json()['admin'],"
        " c.get('/api/admin/check', headers={'X-Admin-Token': good}).get_json()['admin']]))")
    assert jout(run(code, **GOOD)) == [False, False]


@case("força bruta: após ADMIN_LOGIN_MAX erros o login é bloqueado (429), mesmo com a senha certa")
def _():
    code = APP_PRELUDE + (
        "o=[c.post('/api/admin/login', json={'password':'errada'}).status_code for _ in range(5)]\n"
        "o.append(c.post('/api/admin/login', json={'password': A.os.environ['ADMIN_PASSWORD']}).status_code)\nprint(json.dumps(o))")
    assert jout(run(code, **GOOD)) == [401] * 5 + [429]


@case("atrás de proxy confiável cada cliente tem seu próprio limite; sem proxy confiável o X-Forwarded-For é ignorado")
def _():
    code = APP_PRELUDE + (
        "def bad(ip): return c.post('/api/admin/login', json={'password':'errada'}, headers={'X-Forwarded-For': ip}).status_code\n"
        "a=[bad('1.1.1.1') for _ in range(6)]\nb=bad('2.2.2.2')\nprint(json.dumps([a,b]))")
    a, b = jout(run(code, **{**GOOD, "TRUSTED_PROXY_COUNT": "1"}))
    assert a == [401] * 5 + [429] and b == 401, (a, b)          # outro IP não é bloqueado junto
    a2, _b2 = jout(run(code, **GOOD))                           # sem proxy confiável: IP forjado não escapa do limite
    assert a2 == [401] * 5 + [429] and _b2 == 429, (a2, _b2)


@case("login não registra a senha nos logs")
def _():
    code = APP_PRELUDE + "c.post('/api/admin/login', json={'password':'tentativa-super-secreta-999'})\nprint('feito')"
    r = run(code, **{**GOOD, "LOG_LEVEL": "DEBUG"})
    assert "tentativa-super-secreta-999" not in r.stdout + r.stderr


@case("exportação CSV neutraliza células que viram fórmula em planilhas")
def _():
    code = ("import json, app as A\nprint(json.dumps([A._cell('=1+1'), A._cell('+55'), A._cell('@SUM(A1)'), A._cell('-1+2'),"
            " A._cell('Maria'), A._cell(1500)]))")
    assert jout(run(code, **GOOD)) == ["'=1+1", "'+55", "'@SUM(A1)", "'-1+2", "Maria", 1500]


# ---------------------------------------------------------------- gunicorn.conf.py
@case("gunicorn.conf.py respeita PORT, loga em stdout e não usa valores fixos perigosos")
def _():
    conf = HERE / "gunicorn.conf.py"
    if not conf.exists():
        raise AssertionError("gunicorn.conf.py não existe")
    code = f"ns={{}}; exec(open({str(conf)!r}).read(), ns); print(ns['bind'], ns['accesslog'], ns['errorlog'], ns['workers'], ns['threads'])"
    r = run(code, PORT="8123")
    assert r.stdout.split() == ["0.0.0.0:8123", "-", "-", "1", "8"], (r.stdout, r.stderr[-300:])
    r = run(code)  # sem PORT
    assert r.stdout.split()[0] == "0.0.0.0:8000", r.stdout


shutil.rmtree(TMP, ignore_errors=True)
bad = [r for r in results if r[1] != "OK"]
print(f"\n{len(results) - len(bad)}/{len(results)} testes passaram")
sys.exit(1 if bad else 0)
