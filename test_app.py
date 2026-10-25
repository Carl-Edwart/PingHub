"""Testes da lógica de torneios, partidas, ELO e atletas — banco simulado em SQLite, sem MySQL.  Rodar: python test_app.py"""
import sys, types, sqlite3, json, datetime, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ['PINGHUB_ENV'] = 'development'   # testes usam o modo desenvolvimento (a validação de produção é testada em test_production.py)
os.environ['ADMIN_PASSWORD'] = 'senha-de-teste'
os.environ['SECRET_KEY'] = 'segredo-de-teste-somente-para-testes'
os.environ['ADMIN_TOKEN_HOURS'] = '12'

# --- dependências externas que podem não estar instaladas (só o Flask é necessário) ---
import types as _t
for _n in ('pymysql', 'dotenv'):
    try: __import__(_n)
    except ImportError:
        _m = _t.ModuleType(_n); sys.modules[_n] = _m
        if _n == 'dotenv': _m.load_dotenv = lambda *a, **k: None
from werkzeug.exceptions import HTTPException as Abort

# --- db falso (SQLite) ---
con = sqlite3.connect(':memory:'); con.row_factory = lambda c, r: {d[0]: r[i] for i, d in enumerate(c.description)}
con.executescript("""
CREATE TABLE athletes(id INTEGER PRIMARY KEY AUTOINCREMENT,name,nickname,photo,hand DEFAULT 'destro',play_style DEFAULT 'classica',game_style DEFAULT 'ataque',elo INT DEFAULT 1000,wins INT DEFAULT 0,losses INT DEFAULT 0,tournaments_won INT DEFAULT 0,tournaments_second INT DEFAULT 0,tournaments_third INT DEFAULT 0,club,birth_date,blade,rubber_fh,rubber_bh,bio,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE tournaments(id INTEGER PRIMARY KEY AUTOINCREMENT,name,date,type,points_per_set,best_of,status DEFAULT 'active',champion_id,location,seeding DEFAULT 'random',third_place INT DEFAULT 0);
CREATE TABLE tournament_players(tournament_id,athlete_id);
CREATE TABLE matches(id INTEGER PRIMARY KEY AUTOINCREMENT,player1_id,player2_id,player1_name,player2_name,modality,mode,points_per_set,best_of,sets_json,sets_p1,sets_p2,winner,duration,tournament_id,notes,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE tournament_matches(id INTEGER PRIMARY KEY AUTOINCREMENT,tournament_id,round,position,player1_id,player2_id,winner_id,match_id,status DEFAULT 'waiting',third_place INT DEFAULT 0);
CREATE TABLE elo_history(id INTEGER PRIMARY KEY AUTOINCREMENT,athlete_id,match_id,delta,elo_after,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
""")
def _c(sql, args):
    return sql.replace('%s', '?').replace(' FOR UPDATE', ''), [a.isoformat() if isinstance(a, datetime.date) else a for a in args]
def q(sql, args=(), one=False):
    s, a = _c(sql, args); cur = con.execute(s, a); return cur.fetchone() if one else cur.fetchall()
def x(sql, args=()):
    s, a = _c(sql, args); return con.execute(s, a).lastrowid

import app as APP
T = M = A = APP
_real = (APP.jsonify, APP.request)
APP.q, APP.x = q, x
APP.jsonify = lambda *a, **k: (k or (a[0] if a else None))
ADMIN_TOKEN = APP._admin_serializer().dumps({'role': 'admin'})
import random
fl = types.SimpleNamespace()

def post(mod_fn, payload):
    APP.request = types.SimpleNamespace(args={}, get_json=lambda silent=True, force=False: payload,
                                        headers={'X-Admin-Token': ADMIN_TOKEN}, remote_addr='127.0.0.1')
    return mod_fn()

def play_all(tid):
    n, summary = 0, None
    while True:
        d = T.get_tournament(tid)
        todo = [m for m in d['matches'] if m['status'] == 'waiting' and m['player1_id'] and m['player2_id']]
        assert todo, ('torneio travado sem confronto disponível', d['matches'])
        m = random.choice(todo)
        sets = [[11, 5], [11, 8]] if random.random() < .5 else [[5, 11], [8, 11]]
        r = post(M.create_match, {'tournament_match_id': m['id'], 'sets': sets, 'duration': 300})[0]
        assert r['winner'] in (1, 2) and r['elo']
        n += 1
        if r.get('tournament_result'):
            summary = r['tournament_result']
            break
    return summary, n

def tour(kind, n, third=False):
    ids = [x("INSERT INTO athletes(name) VALUES (%s)", (f'A{i}',)) for i in range(n)]
    tid = post(T.create_tournament, {'name': f'T-{kind}-{n}', 'type': kind, 'athlete_ids': ids,
                                      'points_per_set': 11, 'best_of': 3, 'third_place': third})[0]['id']
    summary, played = play_all(tid)
    assert summary and summary['tournament']['status'] == 'finished', summary
    st = summary['standings']
    champ = summary['tournament']['champion_id']
    assert st[0]['athlete_id'] == champ and st[0]['place'] == 1
    exp = n - 1 if kind == 'knockout' else n * (n - 1) // 2
    if third: exp += 1
    assert played == exp, (played, exp)
    assert len(summary['matches']) == exp
    # o evento é apagado automaticamente, mas títulos e partidas permanecem
    try: T.get_tournament(tid); raise SystemExit('torneio deveria ter sido apagado')
    except Abort as e: assert e.code == 404
    cols = {1: 'tournaments_won', 2: 'tournaments_second', 3: 'tournaments_third'}
    for s in st:
        col = cols.get(s['place'])
        if col:
            got = q(f"SELECT {col} c FROM athletes WHERE id=%s", (s['athlete_id'],), one=True)['c']
            assert got >= 1, (s['name'], s['place'], got)
    if third:
        assert [s['place'] for s in st].count(3) == 1 and any(s['place'] == 4 for s in st)
        assert sum(1 for m in summary['matches'] if m['third_place']) == 1
    print(kind, n, 'ok | jogos:', played, '| pódio:', [(s['name'], s['place']) for s in st[:4]])

random.seed(1)
for n in (2, 3, 5, 8, 9): tour('knockout', n)
for n in (3, 4): tour('round_robin', n)
tour('knockout', 4, third=True)
tour('knockout', 5, third=True)

# ELO conserva soma e partida avulsa/anônima/cooperativa
tot = q("SELECT SUM(elo-1000) s FROM athletes", one=True)['s']; assert tot == 0, tot
a, b = [x("INSERT INTO athletes(name) VALUES (%s)", (n,)) for n in 'XY']
r = post(M.create_match, {'player1': {'athlete_id': a, 'name': 'X'}, 'player2': {'name': 'Visitante'}, 'points_per_set': 11, 'best_of': 3, 'sets': [[11, 3], [11, 4]]})[0]
assert r['elo'] is None and q("SELECT wins FROM athletes WHERE id=%s", (a,), one=True)['wins'] == 1
r = post(M.create_match, {'mode': 'cooperative', 'player1': {'name': 'P'}, 'player2': {'name': 'Q'},
                          'duration': 480, 'sets': [[7, 7]]})[0]
assert r['winner'] is None and r['sets_p1'] == r['sets_p2'] == 0 and r['elo'] is None
coop = q("SELECT * FROM matches WHERE id=%s", (r['id'],), one=True)
assert json.loads(coop['sets_json']) == [] and coop['winner'] is None and coop['duration'] == 480
r = post(M.create_match, {'player1': {'athlete_id': a}, 'player2': {'athlete_id': b}, 'points_per_set': 11, 'best_of': 3, 'sets': [[4, 11], [3, 11]]})[0]
assert r['elo']['player1']['delta'] == -r['elo']['player2']['delta']
for bad in ({'player1': {'name': 'a'}, 'player2': {'name': 'b'}, 'sets': []},
            {'player1': {'athlete_id': a}, 'player2': {'athlete_id': a}, 'sets': [[11, 1]]}):
    try: post(M.create_match, bad); raise SystemExit('deveria falhar')
    except Abort as e: assert e.code == 400
print('partidas avulsas/validações ok')

# cadastro de atleta: empunhadura, mão e estilo de jogo
r = post(A.create_athlete, {'name': 'Estilo', 'hand': 'canhoto', 'play_style': 'caneta',
                            'game_style': 'contra_ataque'})[0]
assert (r['hand'], r['play_style'], r['game_style']) == ('canhoto', 'caneta', 'contra_ataque'), r
for bad in ({'name': 'Invalido', 'hand': 'esquerda'}, {'name': 'Invalido', 'game_style': 'bloqueio'}):
    try: post(A.create_athlete, bad); raise SystemExit('deveria falhar')
    except Abort as e: assert e.code == 400
print('cadastro de atleta ok')

# torneio com sets de 3 pontos
ids = [x("INSERT INTO athletes(name) VALUES (%s)", (f'B{i}',)) for i in range(2)]
tid = post(T.create_tournament, {'name': 'T-3pts', 'type': 'knockout', 'athlete_ids': ids,
                                 'points_per_set': 3, 'best_of': 3})[0]['id']
tm = q("SELECT id FROM tournament_matches WHERE tournament_id=%s AND player1_id IS NOT NULL "
       "AND player2_id IS NOT NULL", (tid,), one=True)
r = post(M.create_match, {'tournament_match_id': tm['id'], 'sets': [[3, 1], [3, 2]], 'duration': 60})[0]
assert (r['sets_p1'], r['sets_p2']) == (2, 0), r
d = r['tournament_result']
assert d['tournament']['status'] == 'finished' and d['tournament']['points_per_set'] == 3, d['tournament']
champ = d['tournament']['champion_id']
runner = next(s['athlete_id'] for s in d['standings'] if s['place'] == 2)
try: T.get_tournament(tid); raise SystemExit('torneio deveria ter sido apagado')
except Abort as e: assert e.code == 404
cols = "tournaments_won, tournaments_second, tournaments_third"
c = q(f"SELECT {cols} FROM athletes WHERE id=%s", (champ,), one=True)
r = q(f"SELECT {cols} FROM athletes WHERE id=%s", (runner,), one=True)
assert tuple(c.values()) == (1, 0, 0), c
assert tuple(r.values()) == (0, 1, 0), r
print('sets de 3 pontos ok')
print('títulos por posição ok')

# ---- novos campos do atleta
r = post(A.create_athlete, {'name': 'Campo', 'club': 'Ping Club', 'birth_date': '2000-05-01', 'blade': 'Base X',
                            'rubber_fh': 'FH 1', 'rubber_bh': 'BH 1', 'bio': 'Destro agressivo'})[0]
assert (r['club'], r['blade'], r['rubber_fh'], r['bio']) == ('Ping Club', 'Base X', 'FH 1', 'Destro agressivo'), r
for bad in ({'name': 'Campo', 'birth_date': '31/12/2000'}, {'name': 'Campo', 'birth_date': '2999-01-01'}):
    try: post(A.create_athlete, bad); raise SystemExit('deveria falhar')
    except Abort as e: assert e.code == 400
r2 = post(lambda: A.update_athlete(r['id']), {'name': 'Campo', 'club': 'Outro Clube'})
assert r2['club'] == 'Outro Clube' and r2['blade'] is None      # campos não enviados são limpos, foto preservada
print('campos do atleta ok')

# ---- validação do placar em partida competitiva
v1, v2 = [x("INSERT INTO athletes(name) VALUES (%s)", (n,)) for n in ('V1', 'V2')]
base = {'player1': {'athlete_id': v1}, 'player2': {'athlete_id': v2}, 'points_per_set': 11, 'best_of': 3}
for bad in ([[11, 9]], [[11, 10], [11, 5]], [[12, 9], [11, 3]], [[11, 5], [11, 3], [11, 2]], [[15, 5], [11, 3]]):
    try: post(M.create_match, {**base, 'sets': bad}); raise SystemExit(f'deveria falhar: {bad}')
    except Abort as e: assert e.code == 400, bad
ok = post(M.create_match, {**base, 'sets': [[11, 9], [9, 11], [13, 11]], 'notes': 'amistoso'})[0]
assert ok['winner'] == 1 and ok['sets_p1'] == 2
assert q("SELECT notes FROM matches WHERE id=%s", (ok['id'],), one=True)['notes'] == 'amistoso'
print('validação de placar ok')

# ---- estatísticas do perfil
d = A.get_athlete(v1)
s = d['stats']
assert (s['points_for'], s['points_against'], s['matches']) == (33, 31, 1), s
assert (s['streak'], s['best_streak'], s['rival']) == (1, 1, None) and s['best_elo'] >= 1000, s
post(M.create_match, {**base, 'sets': [[11, 3], [11, 4]]})
s = A.get_athlete(v1)['stats']
assert s['streak'] == 2 and s['rival']['matches'] == 2 and s['rival']['wins'] == 2, s
print('estatísticas do perfil ok')

# ---- cabeças de chave por ELO
for n in (3, 5, 8):
    ids = [x("INSERT INTO athletes(name, elo) VALUES (%s,%s)", (f'S{n}-{i}', 1000 + i * 10)) for i in range(n)]
    tid = post(T.create_tournament, {'name': f'Seed{n}', 'type': 'knockout', 'athlete_ids': ids, 'seeding': 'elo',
                                      'points_per_set': 11, 'best_of': 3, 'location': 'Ginásio'})[0]['id']
    d = T.get_tournament(tid)
    r1 = [m for m in d['matches'] if m['round'] == 1]
    assert r1[0]['player1_id'] == ids[-1], 'cabeça 1 deve abrir a chave'
    assert any(m['player1_id'] == ids[-2] for m in r1[len(r1) // 2:]), 'cabeça 2 deve ficar no outro lado'
    assert d['tournament']['location'] == 'Ginásio' and d['tournament']['seeding'] == 'elo'
    summary, played = play_all(tid)
    assert summary['tournament']['status'] == 'finished' and played == n - 1, (n, played)
try: post(T.create_tournament, {'name': 'X', 'type': 'knockout', 'athlete_ids': ids, 'seeding': 'xyz'}); raise SystemExit('deveria falhar')
except Abort as e: assert e.code == 400
print('cabeças de chave ok')

# ---- números gerais (todos os torneios de teste terminaram e foram apagados)
st = APP.stats()
assert st['athletes'] > 10 and st['matches'] > 10 and st['tournaments'] == 0 and st['active_tournaments'] == 0, st
print('estatísticas gerais ok')

# ---- servidor: index, conteúdo e isolamento de arquivos sensíveis (sem MySQL) ----
APP.jsonify, APP.request = _real
APP._ready = True
c = APP.app.test_client()
assert c.get('/').status_code == 200 and b'PING' in c.get('/').data

# ---- segurança: leitura/partidas livres; atletas e torneios só com token admin
assert c.get('/api/athletes').status_code == 200
assert c.post('/api/athletes', json={'name': 'Intruso'}).status_code == 401
assert c.post('/api/tournaments', json={'name': 'Intruso', 'type': 'knockout', 'athlete_ids': [1, 2]}).status_code == 401
assert c.delete('/api/tournaments/999999').status_code == 401
assert c.get('/api/admin/check').get_json()['admin'] is False

for _ in range(5):
    bad = c.post('/api/admin/login', json={'password': 'errada'}, environ_overrides={'REMOTE_ADDR': '10.9.9.9'})
    assert bad.status_code == 401, bad.status_code
blocked = c.post('/api/admin/login', json={'password': 'errada'}, environ_overrides={'REMOTE_ADDR': '10.9.9.9'})
assert blocked.status_code == 429, blocked.status_code

good = c.post('/api/admin/login', json={'password': os.environ['ADMIN_PASSWORD']})
assert good.status_code == 200 and good.headers.get('Cache-Control') == 'no-store', good.status_code
TOKEN = good.get_json()['token']
H = {'X-Admin-Token': TOKEN}
assert c.get('/api/admin/check', headers=H).get_json()['admin'] is True
created = c.post('/api/athletes', json={'name': 'Atleta Admin'}, headers=H)
assert created.status_code == 201, created.status_code
assert c.post('/api/athletes', json={'name': 'Atleta Admin'}, headers={'X-Admin-Token': 'falso'}).status_code == 401
free_match = c.post('/api/matches', json={'player1': {'name': 'Livre 1'}, 'player2': {'name': 'Livre 2'},
                                          'points_per_set': 3, 'best_of': 1, 'sets': [[3, 1]]})
assert free_match.status_code == 201, free_match.status_code
assert c.delete('/api/tournaments/999999', headers=H).status_code == 404

assert len(c.get('/api/estudo').get_json()) > 0 and set(c.get('/api/regras').get_json()) == {'ittf', 'local', 'sistema'}
assert all(len(v) >= 6 for v in c.get('/api/regras').get_json().values())
for secret in ('/.env', '/app.py', '/conteudo.json', '/.env.example'):
    assert c.get(secret).status_code == 404, secret
print('servidor/índice/conteúdo ok; arquivos sensíveis não são expostos')
