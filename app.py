"""PingHub — backend completo em um único arquivo: config, PostgreSQL, esquema, ELO, chaves, API REST e frontend.

Desenvolvimento: PINGHUB_ENV=development python app.py  →  http://localhost:5000
Produção:        python app.py init-db && gunicorn app:app  (ver DEPLOY.md)
"""
import base64, csv, hmac, io, itertools, json, logging, math, os, random, re, sys, threading, time
from datetime import date, datetime
from decimal import Decimal
from functools import wraps
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from flask import Blueprint, Flask, Response, abort, g, jsonify, request, send_from_directory
from flask.json.provider import DefaultJSONProvider
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv()
ROOT = Path(__file__).resolve().parent
api = Blueprint("api", __name__)

ENV = os.getenv("PINGHUB_ENV", "production").strip().lower()
IS_DEV = ENV in ("development", "dev", "test", "testing")


class ConfigError(RuntimeError):
    """Configuração inválida sem expor valores de variáveis de ambiente."""


_WEAK = {"", "pinghub", "pinghub-local-only", "root", "password", "senha", "admin", "secret", "changeme", "change-me",
         "replace-with-a-strong-password", "replace-with-a-random-secret"}


def _is_weak(value):
    value = (value or "").strip().lower()
    return value in _WEAK or value.startswith(("troque", "defina", "replace-with", "example", "exemplo"))


def _env_int(name, default, minimum=None, maximum=None):
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw.strip())
    except ValueError:
        raise ConfigError(f"{name} deve ser um número inteiro.") from None
    if (minimum is not None and value < minimum) or (maximum is not None and value > maximum):
        raise ConfigError(f"{name} fora do intervalo permitido.")
    return value


def _env_bool(name, default=False):
    raw = os.getenv(name)
    return default if raw is None or not raw.strip() else raw.strip().lower() in ("1", "true", "yes", "on", "sim")


def validate_config():
    problems = []
    for name, lo, hi in (("PORT", 1, 65535), ("DB_PORT", 1, 65535),
                         ("DB_CONNECT_TIMEOUT", 1, 120), ("ADMIN_TOKEN_HOURS", 1, None),
                         ("ADMIN_LOGIN_WINDOW", 60, None), ("ADMIN_LOGIN_MAX", 1, None),
                         ("TRUSTED_PROXY_COUNT", 0, 10)):
        try:
            _env_int(name, None, lo, hi)
        except ConfigError as exc:
            problems.append(str(exc))

    if not IS_DEV:
        database_url = (os.getenv("DATABASE_URL") or "").strip()
        if database_url:
            from urllib.parse import urlsplit
            try:
                parsed = urlsplit(database_url)
                valid_url = parsed.scheme in ("postgres", "postgresql") and bool(parsed.hostname) and bool(parsed.path.strip("/"))
            except ValueError:
                valid_url = False
                parsed = None
            if not valid_url:
                problems.append("DATABASE_URL deve ser uma URL PostgreSQL válida.")
            elif parsed.password and _is_weak(parsed.password):
                problems.append("A senha em DATABASE_URL é um valor de exemplo/fraco.")
        else:
            for name in ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"):
                if not (os.getenv(name) or "").strip():
                    problems.append(f"{name} é obrigatória em produção quando DATABASE_URL não está definida.")
            password = os.getenv("DB_PASSWORD") or ""
            if password and _is_weak(password):
                problems.append("DB_PASSWORD é um valor de exemplo/fraco.")

        secret = os.getenv("SECRET_KEY") or ""
        admin = os.getenv("ADMIN_PASSWORD") or ""
        if len(secret) < 32 or _is_weak(secret):
            problems.append("SECRET_KEY precisa ter ao menos 32 caracteres aleatórios.")
        if len(admin) < 12 or _is_weak(admin):
            problems.append("ADMIN_PASSWORD precisa ter ao menos 12 caracteres e não pode ser um valor de exemplo.")
        if secret and admin and secret == admin:
            problems.append("SECRET_KEY e ADMIN_PASSWORD devem ser diferentes.")
    return problems


def _safe_int(name, default, minimum=None):
    try:
        return _env_int(name, default, minimum)
    except ConfigError:
        return default


# ============ SEGURANÇA ADMIN ============
ADMIN_TOKEN_HOURS = _safe_int("ADMIN_TOKEN_HOURS", 12, 1)
ADMIN_TOKEN_AGE = ADMIN_TOKEN_HOURS * 3600
ADMIN_LOGIN_WINDOW = _safe_int("ADMIN_LOGIN_WINDOW", 900, 60)
ADMIN_LOGIN_MAX = _safe_int("ADMIN_LOGIN_MAX", 5, 1)
_login_fails = {}
_login_lock = threading.Lock()


def _admin_password():
    return os.getenv("ADMIN_PASSWORD", "")


def _admin_serializer():
    """Assinador dos tokens administrativos. Sem segredo, a área fica indisponível."""
    secret = os.getenv("SECRET_KEY", "")
    if not secret:
        return None
    return URLSafeTimedSerializer(secret, salt="pinghub-admin")


def _is_admin():
    token = (getattr(request, "headers", {}) or {}).get("X-Admin-Token", "").strip()
    serializer = _admin_serializer()
    if not token or not serializer:
        return False
    try:
        data = serializer.loads(token, max_age=ADMIN_TOKEN_AGE)
    except (BadSignature, SignatureExpired):
        return False
    return data.get("role") == "admin"


def admin_required(fn):
    @wraps(fn)
    def guarded(*args, **kwargs):
        if not _is_admin():
            abort(401, "Acesso restrito ao administrador.")
        return fn(*args, **kwargs)
    return guarded


def _login_ip():
    return getattr(request, "remote_addr", None) or "local"


def _login_blocked(ip):
    now = time.monotonic()
    with _login_lock:
        recent = [t for t in _login_fails.get(ip, []) if now - t < ADMIN_LOGIN_WINDOW]
        _login_fails[ip] = recent
        return len(recent) >= ADMIN_LOGIN_MAX


def _login_failed(ip):
    with _login_lock:
        now = time.monotonic()
        if len(_login_fails) > 2000:
            for key, values in list(_login_fails.items()):
                if not values or now - values[-1] > ADMIN_LOGIN_WINDOW:
                    _login_fails.pop(key, None)
        _login_fails.setdefault(ip, []).append(time.monotonic())


def _login_ok(ip):
    with _login_lock:
        _login_fails.pop(ip, None)


# ============ BANCO DE DADOS ============

SCHEMA = """
CREATE TABLE IF NOT EXISTS athletes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  nickname VARCHAR(50) NULL,
  photo TEXT NULL,                       -- data URL (imagem reduzida no navegador)
  hand VARCHAR(30) NOT NULL DEFAULT 'destro',
  play_style VARCHAR(30) NOT NULL DEFAULT 'classica',
  game_style VARCHAR(30) NOT NULL DEFAULT 'ataque',
  elo INT NOT NULL DEFAULT 1000,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  tournaments_won INT NOT NULL DEFAULT 0,
  tournaments_second INT NOT NULL DEFAULT 0,
  tournaments_third INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(30) NOT NULL,
  points_per_set SMALLINT NOT NULL DEFAULT 11,
  best_of SMALLINT NOT NULL DEFAULT 3,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  champion_id INT NULL,
  third_place SMALLINT NOT NULL DEFAULT 0,       -- disputa opcional de 3º lugar
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (champion_id) REFERENCES athletes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tournament_players (
  tournament_id INT NOT NULL,
  athlete_id INT NOT NULL,
  PRIMARY KEY (tournament_id, athlete_id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  player1_id INT NULL,
  player2_id INT NULL,
  player1_name VARCHAR(100) NOT NULL,
  player2_name VARCHAR(100) NOT NULL,
  modality VARCHAR(30) NOT NULL DEFAULT 'singles',
  mode VARCHAR(30) NOT NULL DEFAULT 'competitive',
  points_per_set SMALLINT NOT NULL DEFAULT 3,
  best_of SMALLINT NOT NULL DEFAULT 1,
  sets_json JSON NOT NULL,                     -- [[11,7],[9,11],...]
  sets_p1 SMALLINT NOT NULL DEFAULT 0,
  sets_p2 SMALLINT NOT NULL DEFAULT 0,
  winner SMALLINT NULL,                         -- 1, 2 ou NULL
  duration INT NOT NULL DEFAULT 0,             -- segundos
  tournament_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player1_id) REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (player2_id) REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL,
  round SMALLINT NOT NULL,
  position SMALLINT NOT NULL,
  player1_id INT NULL,
  player2_id INT NULL,
  winner_id INT NULL,
  match_id INT NULL,                           -- NULL + status 'done' = folga (bye)
  third_place SMALLINT NOT NULL DEFAULT 0,      -- 1 = disputa de 3º lugar
  status VARCHAR(30) NOT NULL DEFAULT 'waiting',
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (player2_id) REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_id) REFERENCES athletes(id) ON DELETE SET NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS elo_history (
  id SERIAL PRIMARY KEY,
  athlete_id INT NOT NULL,
  match_id INT NOT NULL,
  delta INT NOT NULL,
  elo_after INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mesa_state (
  id SMALLINT PRIMARY KEY,
  occupied_by VARCHAR(100) NULL,
  started_at TIMESTAMP NULL,
  minutes INT NULL
);
INSERT INTO mesa_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS mesa_queue (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""

# colunas acrescentadas depois da 1ª versão — aplicadas sozinhas em bancos que já existem
MIGRATIONS = [
    ("athletes", "club", "VARCHAR(80) NULL"), ("athletes", "birth_date", "DATE NULL"),
    ("athletes", "blade", "VARCHAR(80) NULL"), ("athletes", "rubber_fh", "VARCHAR(80) NULL"),
    ("athletes", "rubber_bh", "VARCHAR(80) NULL"), ("athletes", "bio", "VARCHAR(500) NULL"),
    ("tournaments", "location", "VARCHAR(120) NULL"), ("tournaments", "seeding", "VARCHAR(10) NOT NULL DEFAULT 'random'"),
    ("tournaments", "third_place", "SMALLINT NOT NULL DEFAULT 0"),
    ("tournament_matches", "third_place", "SMALLINT NOT NULL DEFAULT 0"),
    ("matches", "notes", "VARCHAR(200) NULL"),
]


def _database_url():
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        return url
    # Compatibilidade com PostgreSQL local usando variáveis individuais.
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "5432")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "")
    name = os.getenv("DB_NAME", "pinghub")
    from urllib.parse import quote
    credentials = quote(user, safe="")
    if password:
        credentials += ":" + quote(password, safe="")
    return f"postgresql://{credentials}@{host}:{port}/{quote(name, safe='')}"


def _connect(**kwargs):
    return psycopg.connect(
        _database_url(),
        connect_timeout=_safe_int("DB_CONNECT_TIMEOUT", 10, 1),
        **kwargs,
    )


def init_db():
    """Cria o esquema PostgreSQL idempotentemente; não cria bancos nem apaga dados."""
    con = _connect(row_factory=dict_row)
    try:
        with con.cursor() as c:
            for stmt in filter(None, (s.strip() for s in SCHEMA.split(";"))):
                c.execute(stmt)
            for table, col, ddl in MIGRATIONS:
                c.execute(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_schema = current_schema() AND table_name = %s AND column_name = %s",
                    (table, col),
                )
                if not c.fetchone():
                    ddl = ddl.replace("TINYINT", "SMALLINT").replace("DATETIME", "TIMESTAMP")
                    c.execute(f'ALTER TABLE "{table}" ADD COLUMN "{col}" {ddl}')
            c.execute("CREATE INDEX IF NOT EXISTS idx_elo ON athletes (elo)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_created ON matches (created_at)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_ath ON elo_history (athlete_id, created_at)")
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def conn():
    if "db" not in g:
        g.db = _connect(row_factory=dict_row)
    return g.db


def q(sql, args=(), one=False):
    """SELECT: devolve lista de dicts (ou um dict/None se one=True)."""
    with conn().cursor() as c:
        c.execute(sql, args)
        return c.fetchone() if one else c.fetchall()


def x(sql, args=()):
    """INSERT/UPDATE/DELETE: devolve ID em INSERT; None para outras operações."""
    with conn().cursor() as c:
        normalized = sql.lstrip().upper()
        if normalized.startswith("INSERT ") and " RETURNING " not in normalized:
            match = re.search(r"INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)", sql, re.IGNORECASE)
            table = match.group(1).lower() if match else ""
            if table in {"athletes", "tournaments", "matches", "tournament_matches", "elo_history", "mesa_queue"}:
                sql = sql.rstrip().rstrip(";") + " RETURNING id"
                c.execute(sql, args)
                row = c.fetchone()
                return row["id"] if row else None
        c.execute(sql, args)
        return None


def finish(response):
    """after_request: confirma a transação se deu certo, desfaz se status >= 400."""
    db = g.get("db")
    if db is not None:
        try:
            db.commit() if response.status_code < 400 else db.rollback()
        except psycopg.Error as exc:
            try:
                db.rollback()
            except psycopg.Error:
                logging.getLogger("pinghub").error("Rollback após falha de commit também falhou.")
            logging.getLogger("pinghub").error("Commit do banco falhou (%s).", type(exc).__name__)
            response = jsonify(error="Banco de dados indisponível no momento. Tente novamente.")
            response.status_code = 503
    return response


def close(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        try:
            db.close()
        except psycopg.Error as exc:
            logging.getLogger("pinghub").warning("Fechamento da conexão falhou (%s).", type(exc).__name__)


# ============ ELO ============
ELO_INITIAL = 1000
K_MATCH = 32        # partidas avulsas
K_TOURNAMENT = 16   # partidas de torneio


def calculate_elo(rating_a, rating_b, score_a, k=K_MATCH):
    """score_a: 1 se A venceu, 0 se perdeu. Retorna (novoA, novoB, deltaA, deltaB)."""
    expected_a = 1 / (1 + 10 ** ((rating_b - rating_a) / 400))
    delta_a = round(k * (score_a - expected_a))
    return rating_a + delta_a, rating_b - delta_a, delta_a, -delta_a


# ============ CHAVEAMENTO ============

def knockout(ids, seeded=False):
    """Eliminatória simples. Retorna lista de dicts {round, position, p1, p2}.
    Aleatória: completa com folgas (None) até potência de 2, nunca colocando duas folgas juntas.
    seeded=True: `ids` já vem ordenado do melhor para o pior (cabeças de chave: 1x8, 4x5, 2x7, 3x6…);
    as folgas ficam com os melhores colocados."""
    ids = list(ids)
    n = len(ids)
    size = 1
    while size < n:
        size *= 2
    pairs = size // 2
    if seeded:
        order = [1]
        while len(order) < size:
            order = [s for k in order for s in (k, 2 * len(order) + 1 - k)]
        slots = [ids[s - 1] if s <= n else None for s in order]
        matches = [{"round": 1, "position": i, "p1": slots[2 * i], "p2": slots[2 * i + 1]} for i in range(pairs)]
    else:
        random.shuffle(ids)
        top, rest = ids[:pairs], ids[pairs:]
        bottom = rest + [None] * (pairs - len(rest))
        matches = [{"round": 1, "position": i, "p1": top[i], "p2": bottom[i]} for i in range(pairs)]
    for r in range(2, int(math.log2(size)) + 1):
        matches += [{"round": r, "position": i, "p1": None, "p2": None} for i in range(size // 2 ** r)]
    return matches


def round_robin(ids):
    """Todos contra todos."""
    ids = list(ids)
    random.shuffle(ids)
    return [{"round": 1, "position": i, "p1": a, "p2": b}
            for i, (a, b) in enumerate(itertools.combinations(ids, 2))]


def place_for_round(reached, last_round):
    """Colocação (empatada) de quem parou na rodada `reached` numa eliminatória: semi=3º, quartas=5º..."""
    return 2 ** (last_round - reached) + 1


# ============ ATLETAS ============
HANDS = ("destro", "canhoto")
STYLES = ("caneta", "classineta", "classica")
GAME_STYLES = ("ataque", "contra_ataque", "defesa")
LIST_COLS = ("id, name, nickname, hand, play_style, game_style, elo, wins, losses, "
             "tournaments_won, tournaments_second, tournaments_third, "
             "club, birth_date, blade, rubber_fh, rubber_bh, bio, "
             "(photo IS NOT NULL AND photo <> '') AS has_photo, created_at")


def _clean(d):
    name = (d.get("name") or "").strip()
    if len(name) < 2:
        abort(400, "Informe o nome do atleta (mínimo 2 letras).")
    hand = d.get("hand") or "destro"
    style = d.get("play_style") or "classica"
    game_style = d.get("game_style") or "ataque"
    if hand not in HANDS:
        abort(400, "Mão inválida.")
    if style not in STYLES:
        abort(400, "Estilo inválido.")
    if game_style not in GAME_STYLES:
        abort(400, "Estilo de jogo inválido.")
    photo = d.get("photo") or None
    if photo and (not photo.startswith("data:image/") or len(photo) > 600_000):
        abort(400, "Foto inválida ou grande demais.")
    birth = d.get("birth_date") or None
    if birth:
        try:
            birth = date.fromisoformat(str(birth)[:10])
        except ValueError:
            abort(400, "Data de nascimento inválida.")
        if birth > date.today() or birth.year < 1900:
            abort(400, "Data de nascimento inválida.")

    def txt(key, size):
        return (d.get(key) or "").strip()[:size] or None
    return dict(name=name[:100], nickname=txt("nickname", 50), hand=hand, play_style=style, game_style=game_style,
                photo=photo, club=txt("club", 80), birth_date=birth, blade=txt("blade", 80),
                rubber_fh=txt("rubber_fh", 80), rubber_bh=txt("rubber_bh", 80), bio=txt("bio", 500))


def _get_or_404(athlete_id):
    row = q(f"SELECT {LIST_COLS} FROM athletes WHERE id=%s", (athlete_id,), one=True)
    if not row:
        abort(404, "Atleta não encontrado.")
    return row


@api.get("/athletes")
def list_athletes():
    s = f"%{request.args.get('q', '').strip()}%"
    return jsonify(q(f"SELECT {LIST_COLS} FROM athletes WHERE name ILIKE %s OR nickname ILIKE %s "
                     "ORDER BY name", (s, s)))


# ---- autenticação (token assinado, sem cookie de sessão) ----
@api.post("/admin/login")
def admin_login():
    d = request.get_json(silent=True) or {}
    ip = _login_ip()
    if _login_blocked(ip):
        abort(429, "Muitas tentativas. Aguarde alguns minutos e tente de novo.")
    expected = _admin_password()
    serializer = _admin_serializer()
    if not expected or not serializer:
        abort(503, "Administração não configurada. Defina ADMIN_PASSWORD e SECRET_KEY.")
    if not hmac.compare_digest(str(d.get("password") or "").encode(), expected.encode()):
        _login_failed(ip)
        abort(401, "Senha incorreta.")
    _login_ok(ip)
    resp = jsonify(token=serializer.dumps({"role": "admin"}), expires_in=ADMIN_TOKEN_AGE)
    resp.headers["Cache-Control"] = "no-store"
    return resp


@api.get("/admin/check")
def admin_check():
    return jsonify(admin=_is_admin(), expires_in=ADMIN_TOKEN_AGE)


@api.post("/athletes")
@admin_required
def create_athlete():
    f = _clean(request.get_json(silent=True) or {})
    new_id = x(f"INSERT INTO athletes ({', '.join(f)}, elo) VALUES ({', '.join(['%s'] * len(f))}, %s)",
               (*f.values(), ELO_INITIAL))
    return jsonify(_get_or_404(new_id)), 201



@api.get("/athletes/<int:athlete_id>")
def get_athlete(athlete_id):
    a = _get_or_404(athlete_id)
    rows = q("SELECT id, created_at, mode, player1_id, player2_id, player1_name, player2_name, sets_p1, sets_p2, "
             "winner, sets_json, duration FROM matches WHERE player1_id=%s OR player2_id=%s "
             "ORDER BY created_at DESC, id DESC", (athlete_id, athlete_id))
    sets_won = sets_played = pts_for = pts_against = secs = 0
    recent, rivals, results = [], {}, []          # results: mais recente primeiro
    for m in rows:
        me = 1 if m["player1_id"] == athlete_id else 2
        mine, theirs = (m["sets_p1"], m["sets_p2"]) if me == 1 else (m["sets_p2"], m["sets_p1"])
        sets_won += mine
        sets_played += mine + theirs
        sets = json.loads(m["sets_json"]) if isinstance(m["sets_json"], str) else m["sets_json"]
        for s in sets:
            pts_for += s[me - 1]
            pts_against += s[2 - me]
        secs += m["duration"] or 0
        opp = m["player2_name"] if me == 1 else m["player1_name"]
        res = None if not m["winner"] else ("W" if m["winner"] == me else "L")
        if res:
            results.append(res)
            r = rivals.setdefault(opp, {"name": opp, "matches": 0, "wins": 0})
            r["matches"] += 1
            r["wins"] += res == "W"
        if len(recent) < 15:
            recent.append({"id": m["id"], "created_at": m["created_at"], "mode": m["mode"], "opponent": opp,
                           "sets_me": mine, "sets_opp": theirs, "result": res,
                           "duration": m["duration"] or 0})
    best = run = 0
    for r in reversed(results):                  # cronológico
        run = run + 1 if r == "W" else 0
        best = max(best, run)
    cur = 0                                      # + vitórias seguidas / − derrotas seguidas
    if results:
        n = next((i for i, r in enumerate(results) if r != results[0]), len(results))
        cur = n if results[0] == "W" else -n
    rival = max(rivals.values(), key=lambda r: (r["matches"], r["wins"]), default=None)
    top_elo = q("SELECT MAX(elo_after) AS m FROM elo_history WHERE athlete_id=%s", (athlete_id,), one=True)
    history = q("SELECT elo_after, delta, created_at FROM elo_history WHERE athlete_id=%s "
                "ORDER BY id DESC LIMIT 50", (athlete_id,))[::-1]
    tours = q("SELECT t.id, t.name, t.date, t.status, t.champion_id FROM tournaments t "
              "JOIN tournament_players tp ON tp.tournament_id=t.id WHERE tp.athlete_id=%s "
              "ORDER BY t.date DESC", (athlete_id,))
    titles = {"first": a["tournaments_won"] or 0,
              "second": a["tournaments_second"] or 0,
              "third": a["tournaments_third"] or 0}
    titles["total"] = titles["first"] + titles["second"] + titles["third"]
    stats = {"sets_won": sets_won, "sets_played": sets_played, "matches": len(rows),
             "points_for": pts_for, "points_against": pts_against,
             "avg_duration": round(secs / len(rows)) if rows else 0,
             "streak": cur, "best_streak": best, "best_elo": max(ELO_INITIAL, (top_elo or {}).get("m") or 0),
             "rival": rival if rival and rival["matches"] >= 2 else None}
    return jsonify(athlete=a, stats=stats, recent=recent, elo_history=history, tournaments=tours, titles=titles)


@api.put("/athletes/<int:athlete_id>")
@admin_required
def update_athlete(athlete_id):
    _get_or_404(athlete_id)
    d = request.get_json(silent=True) or {}
    f = _clean(d)
    if "photo" not in d:   # só mexe na foto se o campo veio na requisição
        f.pop("photo")
    x(f"UPDATE athletes SET {', '.join(k + '=%s' for k in f)} WHERE id=%s", (*f.values(), athlete_id))
    return jsonify(_get_or_404(athlete_id))


@api.delete("/athletes/<int:athlete_id>")
@admin_required
def delete_athlete(athlete_id):
    _get_or_404(athlete_id)
    x("DELETE FROM athletes WHERE id=%s", (athlete_id,))
    return jsonify(ok=True)


@api.get("/athletes/<int:athlete_id>/photo")
def photo(athlete_id):
    row = q("SELECT photo FROM athletes WHERE id=%s", (athlete_id,), one=True)
    if not row or not row["photo"]:
        abort(404, "Sem foto.")
    head, _, b64 = row["photo"].partition(",")
    mime = head[5:].split(";")[0] or "image/jpeg"
    resp = Response(base64.b64decode(b64), mimetype=mime, headers={"Cache-Control": "no-cache"})
    resp.add_etag()   # navegador revalida e recebe 304 em vez de baixar a foto de novo
    return resp.make_conditional(request)


# ============ TORNEIOS ============
# ---------- lógica (também usada por routes/matches.py) ----------
def _advance(tid, rnd, pos, winner_id):
    """Coloca o vencedor na vaga da rodada seguinte (se existir)."""
    nxt = q("SELECT id FROM tournament_matches WHERE tournament_id=%s AND round=%s AND position=%s",
            (tid, rnd + 1, pos // 2), one=True)
    if nxt:
        col = "player1_id" if pos % 2 == 0 else "player2_id"
        x(f"UPDATE tournament_matches SET {col}=%s WHERE id=%s", (winner_id, nxt["id"]))


def _trows(tid):
    return q("""SELECT tm.*, a1.name AS p1_name, a2.name AS p2_name,
                       (a1.photo IS NOT NULL AND a1.photo <> '') AS p1_photo,
                       (a2.photo IS NOT NULL AND a2.photo <> '') AS p2_photo,
                       m.sets_p1, m.sets_p2
                FROM tournament_matches tm
                LEFT JOIN athletes a1 ON a1.id = tm.player1_id
                LEFT JOIN athletes a2 ON a2.id = tm.player2_id
                LEFT JOIN matches m ON m.id = tm.match_id
                WHERE tm.tournament_id=%s ORDER BY tm.round, tm.position""", (tid,))


def _players(tid):
    return q("""SELECT a.id, a.name, a.elo, (a.photo IS NOT NULL AND a.photo <> '') AS has_photo
                FROM athletes a JOIN tournament_players tp ON tp.athlete_id = a.id
                WHERE tp.tournament_id=%s ORDER BY a.name""", (tid,))


def _standings(t, players, rows):
    if t["type"] == "round_robin":
        st = {p["id"]: {"athlete_id": p["id"], "name": p["name"], "wins": 0, "losses": 0,
                        "sets_for": 0, "sets_against": 0} for p in players}
        for r in rows:
            a, b, w = r["player1_id"], r["player2_id"], r["winner_id"]
            if r["status"] != "done" or a not in st or b not in st:
                continue
            st[a]["sets_for"] += r["sets_p1"] or 0
            st[a]["sets_against"] += r["sets_p2"] or 0
            st[b]["sets_for"] += r["sets_p2"] or 0
            st[b]["sets_against"] += r["sets_p1"] or 0
            st[w]["wins"] += 1
            st[b if w == a else a]["losses"] += 1
        out = sorted(st.values(), key=lambda s: (-s["wins"], -(s["sets_for"] - s["sets_against"]),
                                                 -s["sets_for"], s["name"]))
        for i, s in enumerate(out, 1):
            s["place"] = i
        return out

    # A disputa de 3º lugar não é uma rodada da chave principal: ela fica de fora
    # do cálculo de campeão/vice, mas define 3º e 4º quando foi jogada.
    main = [r for r in rows if not r.get("third_place")]
    last = max(r["round"] for r in main)
    final = next(r for r in main if r["round"] == last)
    reached = {}
    for r in main:
        for pid in (r["player1_id"], r["player2_id"]):
            if pid:
                reached[pid] = max(reached.get(pid, 0), r["round"])
    out = []
    for p in players:
        if p["id"] == final["winner_id"]:
            place = 1
        elif reached.get(p["id"], 1) == last:
            place = 2
        else:
            place = place_for_round(reached.get(p["id"], 1), last)
        out.append({"athlete_id": p["id"], "name": p["name"], "place": place})

    third = next((r for r in rows if r.get("third_place") and r["status"] == "done"), None)
    if third and third["winner_id"]:
        loser = third["player2_id"] if third["winner_id"] == third["player1_id"] else third["player1_id"]
        for s in out:
            if s["athlete_id"] == third["winner_id"]:
                s["place"] = 3
            elif s["athlete_id"] == loser:
                s["place"] = 4
    return sorted(out, key=lambda s: (s["place"], s["name"]))


TITLE_COLS = {1: "tournaments_won", 2: "tournaments_second", 3: "tournaments_third"}


def _tournament_summary(t, players, rows, st):
    """Fotografia completa do torneio antes de o evento ser excluído."""
    info = {k: t.get(k) for k in ("id", "name", "date", "type", "points_per_set", "best_of", "status",
                                 "champion_id", "location", "seeding", "third_place")}
    names = {p["id"]: p["name"] for p in players}
    results = []
    for r in rows:
        if not (r["player1_id"] and r["player2_id"] and r["status"] == "done"):
            continue
        results.append({
            "round": r["round"], "position": r["position"], "third_place": bool(r.get("third_place")),
            "player1_id": r["player1_id"], "player2_id": r["player2_id"], "winner_id": r["winner_id"],
            "player1_name": r["p1_name"], "player2_name": r["p2_name"],
            "sets_p1": r["sets_p1"], "sets_p2": r["sets_p2"],
        })
    return {"tournament": info, "standings": st, "matches": results,
            "champion_name": names.get(t.get("champion_id"), "")}


def _maybe_finish(tid):
    """Encerra o torneio quando TODAS as partidas (inclusive 3º lugar) terminaram.
    Devolve o resumo completo no momento em que ele é encerrado."""
    t = q("SELECT * FROM tournaments WHERE id=%s", (tid,), one=True)
    if not t or t["status"] == "finished":
        return None
    rows = _trows(tid)
    if not rows or any(r["status"] != "done" for r in rows):
        return None
    players = _players(tid)
    st = _standings(t, players, rows)
    champ = st[0]["athlete_id"] if st else None
    x("UPDATE tournaments SET status='finished', champion_id=%s WHERE id=%s", (champ, tid))
    for s in st:
        col = TITLE_COLS.get(s["place"])
        if col:
            x(f"UPDATE athletes SET {col} = {col} + 1 WHERE id=%s", (s["athlete_id"],))
    t = dict(t, status="finished", champion_id=champ)
    return _tournament_summary(t, players, rows, st)


def _fill_third_place(tm, loser_id):
    """Coloca o perdedor da semifinal na vaga correspondente da disputa de 3º lugar."""
    third = q("SELECT * FROM tournament_matches WHERE tournament_id=%s AND third_place=1",
              (tm["tournament_id"],), one=True)
    if third:
        col = "player1_id" if tm["position"] == 0 else "player2_id"
        x(f"UPDATE tournament_matches SET {col}=%s WHERE id=%s", (loser_id, third["id"]))


def apply_result(tm, winner_id, match_id):
    """Chamada ao salvar uma partida de torneio: registra resultado, avança chave, encerra se acabou."""
    x("UPDATE tournament_matches SET winner_id=%s, match_id=%s, status='done' WHERE id=%s",
      (winner_id, match_id, tm["id"]))
    t = q("SELECT * FROM tournaments WHERE id=%s", (tm["tournament_id"],), one=True)
    if t["type"] == "knockout":
        _advance(tm["tournament_id"], tm["round"], tm["position"], winner_id)
        last = q("SELECT MAX(round) AS m FROM tournament_matches "
                 "WHERE tournament_id=%s AND third_place=0", (tm["tournament_id"],), one=True)["m"]
        if t.get("third_place") and last and tm["round"] == last - 1:
            loser = tm["player2_id"] if winner_id == tm["player1_id"] else tm["player1_id"]
            _fill_third_place(tm, loser)
    return _maybe_finish(tm["tournament_id"])


# ---------- rotas ----------
@api.get("/tournaments")
def list_tournaments():
    return jsonify(q("""SELECT t.*, a.name AS champion_name,
                        (SELECT COUNT(*) FROM tournament_players tp WHERE tp.tournament_id = t.id) AS players
                        FROM tournaments t LEFT JOIN athletes a ON a.id = t.champion_id
                        ORDER BY t.date DESC, t.id DESC"""))


@api.post("/tournaments")
@admin_required
def create_tournament():
    d = request.get_json(silent=True) or {}
    name = (d.get("name") or "").strip()
    kind = d.get("type")
    try:
        day = date.fromisoformat(d.get("date") or date.today().isoformat())
        points, best_of = int(d.get("points_per_set", 11)), int(d.get("best_of", 3))
        ids = list({int(i) for i in d.get("athlete_ids") or []})
    except (TypeError, ValueError):
        abort(400, "Dados do torneio inválidos.")
    if len(name) < 2:
        abort(400, "Informe o nome do torneio.")
    if kind not in ("knockout", "round_robin"):
        abort(400, "Tipo de chave inválido.")
    if points not in range(3, 22, 2) or best_of not in (1, 3, 5, 7):
        abort(400, "Configuração de partida inválida.")
    if len(ids) < 2:
        abort(400, "Selecione pelo menos 2 atletas.")
    third_place = bool(d.get("third_place"))
    if third_place and (kind != "knockout" or len(ids) < 4):
        abort(400, "A disputa de 3º lugar exige eliminatória com pelo menos 4 atletas.")
    found = q(f"SELECT id, elo FROM athletes WHERE id IN ({','.join(['%s'] * len(ids))})", ids)
    if len(found) != len(ids):
        abort(404, "Algum atleta selecionado não existe.")
    seeding = d.get("seeding") or "random"
    if seeding not in ("random", "elo"):
        abort(400, "Tipo de sorteio inválido.")
    if kind != "knockout":
        seeding = "random"
    location = (d.get("location") or "").strip()[:120] or None

    tid = x("INSERT INTO tournaments (name, date, type, points_per_set, best_of, location, seeding, third_place) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (name[:120], day, kind, points, best_of, location, seeding, int(third_place)))
    for aid in ids:
        x("INSERT INTO tournament_players (tournament_id, athlete_id) VALUES (%s,%s)", (tid, aid))
    if kind == "round_robin":
        plan = round_robin(ids)
    elif seeding == "elo":
        plan = knockout([r["id"] for r in sorted(found, key=lambda r: (-r["elo"], r["id"]))], seeded=True)
    else:
        plan = knockout(ids)
    byes = []
    for m in plan:   # primeiro cria todas as linhas da chave...
        row_id = x("INSERT INTO tournament_matches (tournament_id, round, position, player1_id, player2_id) "
                   "VALUES (%s,%s,%s,%s,%s)", (tid, m["round"], m["position"], m["p1"], m["p2"]))
        if kind == "knockout" and m["round"] == 1 and m["p2"] is None:
            byes.append((row_id, m))
    if third_place:   # disputa extra, fora da chave principal, preenchida ao fim das semifinais
        last_round = max(m["round"] for m in plan)
        x("INSERT INTO tournament_matches (tournament_id, round, position, third_place) "
          "VALUES (%s,%s,%s,1)", (tid, last_round, 1))
    for row_id, m in byes:   # ...depois resolve as folgas, avançando o jogador para a rodada seguinte
        x("UPDATE tournament_matches SET winner_id=%s, status='done' WHERE id=%s", (m["p1"], row_id))
        _advance(tid, 1, m["position"], m["p1"])
    _maybe_finish(tid)
    return jsonify(id=tid), 201


@api.get("/tournaments/<int:tid>")
def get_tournament(tid):
    t = q("SELECT * FROM tournaments WHERE id=%s", (tid,), one=True)
    if not t:
        abort(404, "Torneio não encontrado.")
    players, rows = _players(tid), _trows(tid)
    out = {"tournament": t, "players": players, "matches": rows,
           "rounds": max((r["round"] for r in rows), default=0)}
    if t["status"] == "finished":
        out["standings"] = _standings(t, players, rows)
    return jsonify(out)


@api.delete("/tournaments/<int:tid>")
@admin_required
def delete_tournament(tid):
    if not q("SELECT id FROM tournaments WHERE id=%s", (tid,), one=True):
        abort(404, "Torneio não encontrado.")
    x("DELETE FROM tournaments WHERE id=%s", (tid,))
    return jsonify(ok=True)


# ============ PARTIDAS ============
def _player(spec, label):
    spec = spec or {}
    if spec.get("athlete_id"):
        a = q("SELECT id, name, elo FROM athletes WHERE id=%s", (spec["athlete_id"],), one=True)
        if not a:
            abort(404, "Atleta não encontrado.")
        return a
    name = (spec.get("name") or "").strip()
    if not name:
        abort(400, f"Informe o nome do {label}.")
    return {"id": None, "name": name[:100], "elo": None}


def _sets(raw):
    try:
        sets = [[int(a), int(b)] for a, b in raw]
    except (TypeError, ValueError):
        abort(400, "Placar de sets inválido.")
    if not sets or any(a < 0 or b < 0 or a > 99 or b > 99 for a, b in sets):
        abort(400, "Informe ao menos um set com placar válido.")
    return sets


def _check_sets(sets, points, best_of):
    """Partida competitiva: cada set precisa estar completo e a partida decidida (sem sets sobrando)."""
    need = best_of // 2 + 1
    wins = [0, 0]
    for i, (p1, p2) in enumerate(sets, 1):
        hi, lo = max(p1, p2), min(p1, p2)
        ok = (hi == points and lo < points) if points < 11 else \
             ((hi == points and hi - lo >= 2) or (hi > points and hi - lo == 2))
        if not ok:
            abort(400, f"Set {i} com placar inválido para sets de {points} pontos.")
        if max(wins) == need:
            abort(400, "Há sets depois de a partida já estar decidida.")
        wins[0 if p1 > p2 else 1] += 1
    if max(wins) != need:
        abort(400, f"Partida incompleta: o vencedor precisa de {need} sets.")


@api.post("/matches")
def create_match():
    d = request.get_json(silent=True) or {}
    modality, mode = d.get("modality", "singles"), d.get("mode", "competitive")
    if modality not in ("singles", "doubles") or mode not in ("competitive", "cooperative"):
        abort(400, "Modo ou modalidade inválidos.")
    try:
        points, best_of, duration = int(d.get("points_per_set", 3)), int(d.get("best_of", 1)), int(d.get("duration") or 0)
    except (TypeError, ValueError):
        abort(400, "Configuração inválida.")

    tm = None
    if d.get("tournament_match_id"):   # partida de torneio: jogadores e regras vêm do torneio
        tm = q("SELECT * FROM tournament_matches WHERE id=%s", (d["tournament_match_id"],), one=True)
        if not tm:
            abort(404, "Confronto não encontrado.")
        if tm["status"] == "done" or not (tm["player1_id"] and tm["player2_id"]):
            abort(409, "Este confronto não está disponível para jogo.")
        t = q("SELECT * FROM tournaments WHERE id=%s", (tm["tournament_id"],), one=True)
        points, best_of, mode, modality = t["points_per_set"], t["best_of"], "competitive", "singles"
        s1, s2 = {"athlete_id": tm["player1_id"]}, {"athlete_id": tm["player2_id"]}
    else:
        s1, s2 = d.get("player1") or {}, d.get("player2") or {}
        if modality == "doubles":
            s1, s2 = {"name": s1.get("name")}, {"name": s2.get("name")}
    p1, p2 = _player(s1, "jogador 1"), _player(s2, "jogador 2")
    if p1["id"] and p1["id"] == p2["id"]:
        abort(400, "Escolha dois atletas diferentes.")

    if best_of not in (1, 3, 5, 7) or not 3 <= points <= 21:
        abort(400, "Configuração de partida inválida.")
    if mode == "cooperative":
        # Treino cooperativo: vale só o tempo; sem sets, pontos, vencedor ou ELO.
        sets, sets_p1, sets_p2, winner = [], 0, 0, None
    else:
        sets = _sets(d.get("sets"))
        _check_sets(sets, points, best_of)
        sets_p1, sets_p2 = sum(a > b for a, b in sets), sum(b > a for a, b in sets)
        winner = 1 if sets_p1 > sets_p2 else 2 if sets_p2 > sets_p1 else None
        if tm and not winner:
            abort(400, "Partida de torneio precisa de um vencedor.")

    match_id = x("""INSERT INTO matches (player1_id, player2_id, player1_name, player2_name, modality, mode,
                    points_per_set, best_of, sets_json, sets_p1, sets_p2, winner, duration, tournament_id, notes)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                 (p1["id"], p2["id"], p1["name"], p2["name"], modality, mode, points, best_of,
                  json.dumps(sets), sets_p1, sets_p2, winner, duration, tm["tournament_id"] if tm else None,
                  (d.get("notes") or "").strip()[:200] or None))

    elo = None
    if mode == "competitive" and modality == "singles" and winner:
        won, lost = (p1, p2) if winner == 1 else (p2, p1)
        if won["id"]:
            x("UPDATE athletes SET wins = wins + 1 WHERE id=%s", (won["id"],))
        if lost["id"]:
            x("UPDATE athletes SET losses = losses + 1 WHERE id=%s", (lost["id"],))
        if p1["id"] and p2["id"]:   # ELO só entre dois atletas cadastrados
            n1, n2, d1, d2 = calculate_elo(p1["elo"], p2["elo"], 1 if winner == 1 else 0,
                                           K_TOURNAMENT if tm else K_MATCH)
            for p, new, delta in ((p1, n1, d1), (p2, n2, d2)):
                x("UPDATE athletes SET elo=%s WHERE id=%s", (new, p["id"]))
                x("INSERT INTO elo_history (athlete_id, match_id, delta, elo_after) VALUES (%s,%s,%s,%s)",
                  (p["id"], match_id, delta, new))
            elo = {"player1": {"before": p1["elo"], "after": n1, "delta": d1},
                   "player2": {"before": p2["elo"], "after": n2, "delta": d2}}
    summary = None
    if tm:
        summary = apply_result(tm, (p1 if winner == 1 else p2)["id"], match_id)
        if summary:   # torneio encerrado: devolve o resumo e apaga só o evento
            x("DELETE FROM tournaments WHERE id=%s", (tm["tournament_id"],))
    return jsonify(id=match_id, winner=winner, sets_p1=sets_p1, sets_p2=sets_p2, elo=elo,
                   tournament_result=summary), 201



@api.get("/matches")
def list_matches():
    limit = min(max(request.args.get("limit", 20, type=int), 1), 200)
    s = f"%{request.args.get('q', '').strip()}%"
    rows = q("SELECT m.*, t.name AS tournament_name FROM matches m LEFT JOIN tournaments t ON t.id = m.tournament_id "
             "WHERE m.player1_name ILIKE %s OR m.player2_name ILIKE %s ORDER BY m.created_at DESC, m.id DESC LIMIT %s",
             (s, s, limit))
    for r in rows:
        if isinstance(r["sets_json"], str):
            r["sets_json"] = json.loads(r["sets_json"])
    return jsonify(rows)


# ============ RANKING E EXPORTAÇÕES ============
SQL = """
SELECT a.id, a.name, a.nickname, a.elo, a.wins, a.losses, a.tournaments_won,
       (a.photo IS NOT NULL AND a.photo <> '') AS has_photo,
       COALESCE((SELECT SUM(h.delta) FROM elo_history h
                 WHERE h.athlete_id = a.id AND h.created_at >= NOW() - INTERVAL '7 days'), 0) AS elo_change
FROM athletes a
WHERE a.name ILIKE %s OR a.nickname ILIKE %s
ORDER BY a.elo DESC, a.wins DESC, a.name
"""


def _rrows(search=""):
    s = f"%{search.strip()}%"
    return q(SQL, (s, s))


@api.get("/ranking")
def ranking():
    rows = _rrows(request.args.get("q", ""))
    for i, r in enumerate(rows, 1):
        r["position"] = i
    return jsonify(rows)


def _cell(value):
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + value
    return value


def _csv(filename, header, lines):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows([[_cell(value) for value in row] for row in lines])
    return Response("\ufeff" + buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


@api.get("/export/ranking.csv")
def export_ranking():
    rows = _rrows()
    return _csv("ranking.csv", ["posicao", "nome", "elo", "vitorias", "derrotas", "torneios_ganhos"],
                [[i, r["name"], r["elo"], r["wins"], r["losses"], r["tournaments_won"]]
                 for i, r in enumerate(rows, 1)])


@api.get("/export/matches.csv")
def export_matches():
    rows = q("SELECT * FROM matches ORDER BY created_at DESC, id DESC")
    return _csv("partidas.csv",
                ["data", "jogador1", "jogador2", "modo", "modalidade", "sets", "vencedor", "duracao_s"],
                [[m["created_at"], m["player1_name"], m["player2_name"], m["mode"], m["modality"],
                  "" if m["mode"] == "cooperative" else f"{m['sets_p1']}-{m['sets_p2']}",
                  {1: m["player1_name"], 2: m["player2_name"]}.get(m["winner"], ""), m["duration"]]
                 for m in rows])


@api.get("/stats")
def stats():
    return jsonify(q("SELECT (SELECT COUNT(*) FROM athletes) AS athletes, (SELECT COUNT(*) FROM matches) AS matches, "
                     "(SELECT COUNT(*) FROM tournaments) AS tournaments, "
                     "(SELECT COUNT(*) FROM tournaments WHERE status='active') AS active_tournaments, "
                     "(SELECT COALESCE(SUM(sets_p1 + sets_p2), 0) FROM matches) AS sets", one=True))


# ============ ESTUDO E REGRAS (conteudo.json) ============

def _content():
    return json.loads((ROOT / "conteudo.json").read_text(encoding="utf-8"))


@api.get("/estudo")
def estudo():
    items = _content()["tecnicas"]
    level, cat = request.args.get("level"), request.args.get("category")
    return jsonify([i for i in items if (not level or i["level"] == level) and (not cat or i["category"] == cat)])


@api.get("/regras")
def regras():
    search = request.args.get("q", "").lower().strip()
    cat = request.args.get("category")
    data = _content()
    return jsonify({key: [r for r in data[src]
                          if (not cat or r["category"] == cat)
                          and (not search or search in (r["title"] + " " + r["text"]).lower())]
                    for key, src in (("ittf", "regras_ittf"), ("local", "regras_local"), ("sistema", "regras_sistema"))})


# ============ MESA (fila) ============
STATE_SQL = ("SELECT occupied_by, minutes, "
             "EXTRACT(EPOCH FROM (started_at + minutes * INTERVAL '1 minute' - NOW()))::INTEGER AS remaining_seconds "
             "FROM mesa_state WHERE id=1")


def _status():
    s = q(STATE_SQL, one=True)
    queue = q("SELECT id, name, created_at FROM mesa_queue ORDER BY id")
    return {"occupied": bool(s["occupied_by"]), "occupied_by": s["occupied_by"], "minutes": s["minutes"],
            "remaining_seconds": max(s["remaining_seconds"] or 0, 0) if s["occupied_by"] else None,
            "queue": queue}


def _name():
    name = ((request.get_json(silent=True) or {}).get("name") or "").strip()
    if not name:
        abort(400, "Informe seu nome.")
    return name[:100]


def _occupy(name, minutes):
    x("UPDATE mesa_state SET occupied_by=%s, started_at=NOW(), minutes=%s WHERE id=1", (name, minutes))


@api.get("/mesa")
def status():
    return jsonify(_status())


@api.post("/mesa/occupy")
def occupy():
    d = request.get_json(silent=True) or {}
    name = _name()
    if q("SELECT occupied_by FROM mesa_state WHERE id=1", one=True)["occupied_by"]:
        abort(409, "A mesa já está ocupada.")
    _occupy(name, max(1, min(int(d.get("minutes") or 15), 120)))
    return jsonify(_status())


@api.post("/mesa/release")
def release():
    x("UPDATE mesa_state SET occupied_by=NULL, started_at=NULL, minutes=NULL WHERE id=1")
    return jsonify(_status())


@api.post("/mesa/queue")
def join_queue():
    name = _name()
    if q("SELECT id FROM mesa_queue WHERE name=%s", (name,), one=True):
        abort(409, "Você já está na fila.")
    x("INSERT INTO mesa_queue (name) VALUES (%s)", (name,))
    return jsonify(_status()), 201


@api.delete("/mesa/queue/<int:item_id>")
def leave_queue(item_id):
    x("DELETE FROM mesa_queue WHERE id=%s", (item_id,))
    return jsonify(_status())


@api.post("/mesa/next")
def call_next():
    """Libera a mesa e coloca o primeiro da fila nela."""
    first = q("SELECT id, name FROM mesa_queue ORDER BY id LIMIT 1", one=True)
    if not first:
        abort(404, "A fila está vazia.")
    x("DELETE FROM mesa_queue WHERE id=%s", (first["id"],))
    _occupy(first["name"], 15)
    return jsonify(_status())


# ============ APLICAÇÃO ============

class Provider(DefaultJSONProvider):
    ensure_ascii = False
    sort_keys = False

    @staticmethod
    def default(o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return int(o) if o == o.to_integral() else float(o)
        return DefaultJSONProvider.default(o)


_ready = False
_ready_lock = threading.Lock()
AUTO_INIT = _env_bool("DB_AUTO_INIT", IS_DEV)


def _db_unavailable(exc):
    if isinstance(exc, (psycopg.OperationalError, psycopg.InterfaceError)):
        return True
    state = getattr(exc, "sqlstate", None)
    return bool(state and (state.startswith(("08", "28", "3D")) or state in ("42P01", "57P01", "53300")))


def _configure_logging():
    level = getattr(logging, (os.getenv("LOG_LEVEL") or "INFO").upper(), logging.INFO)
    if not logging.getLogger().handlers:
        logging.basicConfig(stream=sys.stdout, level=level,
                            format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("pinghub").setLevel(level)


def create_app():
    _configure_logging()
    problems = validate_config()
    if problems:
        raise ConfigError("Configuração inválida:\n  - " + "\n  - ".join(problems))

    app = Flask(__name__, static_folder=None)   # sem pasta estática: só o index.html é servido (nada de .env/app.py)
    app.config["MAX_CONTENT_LENGTH"] = 1_048_576
    trusted_proxies = _safe_int("TRUSTED_PROXY_COUNT", 0, 0)
    if trusted_proxies:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=trusted_proxies, x_proto=trusted_proxies)
    app.json = Provider(app)
    app.after_request(finish)
    app.teardown_appcontext(close)
    app.register_blueprint(api, url_prefix="/api")

    @app.after_request
    def _security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.is_secure:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
        return response

    @app.before_request
    def _setup():
        global _ready
        if request.is_json and request.method in ("POST", "PUT", "PATCH"):
            payload = request.get_json(silent=False)
            if not isinstance(payload, dict):
                abort(400, "O corpo JSON deve ser um objeto.")
        if AUTO_INIT and not _ready and request.path.startswith("/api"):
            with _ready_lock:
                if not _ready:
                    init_db()
                    _ready = True

    @app.get("/")
    def index():
        return send_from_directory(ROOT, "index.html", max_age=0)

    @app.get("/health")
    def health():
        return jsonify(status="ok"), 200, {"Cache-Control": "no-store"}

    @app.get("/health/db")
    def health_db():
        try:
            with _connect(row_factory=dict_row) as con, con.cursor() as cursor:
                cursor.execute("SELECT 1 FROM athletes LIMIT 1")
        except psycopg.Error as exc:
            app.logger.error("health/db indisponível (%s, SQLSTATE %s).",
                             type(exc).__name__, getattr(exc, "sqlstate", None) or "unknown")
            return jsonify(status="unavailable"), 503, {"Cache-Control": "no-store"}
        return jsonify(status="ok", database="ok"), 200, {"Cache-Control": "no-store"}

    @app.errorhandler(HTTPException)
    def http_error(e):
        return jsonify(error=e.description), e.code

    @app.errorhandler(psycopg.Error)
    def database_error(exc):
        state = getattr(exc, "sqlstate", None)
        if _db_unavailable(exc):
            app.logger.error("Banco indisponível (%s, SQLSTATE %s).",
                             type(exc).__name__, state or "unknown")
            return jsonify(error="Banco de dados indisponível no momento. Tente novamente."), 503
        app.logger.error("Erro de banco (%s, SQLSTATE %s).", type(exc).__name__, state or "unknown")
        return jsonify(error="Erro interno do servidor"), 500

    @app.errorhandler(Exception)
    def server_error(e):
        app.logger.exception("Erro não tratado em %s %s", request.method, request.path)
        return jsonify(error="Erro interno do servidor"), 500

    return app


app = create_app()

if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "dev"
    if command == "init-db":
        try:
            init_db()
        except psycopg.Error as exc:
            sys.exit(f"Não foi possível inicializar o PostgreSQL ({type(exc).__name__}, SQLSTATE "
                     f"{getattr(exc, 'sqlstate', None) or 'unknown'}). Verifique DATABASE_URL e a disponibilidade do banco.")
        print("Esquema PostgreSQL pronto; nenhuma tabela ou dado foi removido.")
    elif command == "dev":
        if not IS_DEV:
            sys.exit("python app.py é só para desenvolvimento (PINGHUB_ENV=development). Em produção use: gunicorn app:app")
        app.run(host=os.getenv("HOST", "127.0.0.1"),
                port=_safe_int("PORT", 5000, 1), debug=_env_bool("FLASK_DEBUG", False))
    else:
        sys.exit("Uso: python app.py [dev | init-db]")
