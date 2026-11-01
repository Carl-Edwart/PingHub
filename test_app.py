"""Testes da lógica de torneios, partidas, ELO e atletas — SQLite, sem PostgreSQL real.  Rodar: python test_app.py"""
import sys, types, sqlite3, json, datetime, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ['ADMIN_PASSWORD'] = 'senha-de-teste'
os.environ['SECRET_KEY'] = 'segredo-de-teste-somente-para-testes'
os.environ['ADMIN_TOKEN_HOURS'] = '12'
os.environ['PINGHUB_ENV'] = 'development'
os.environ['DB_INIT_ON_START'] = '0'

# --- dependências externas que podem não estar instaladas (só o Flask é necessário) ---
import types as _t
for _n in ('psycopg', 'dotenv'):
    try: __import__(_n)
    except ImportError:
        _m = _t.ModuleType(_n); sys.modules[_n] = _m
        if _n == 'dotenv': _m.load_dotenv = lambda *a, **k: None
        if _n == 'psycopg':
            _m.connect = lambda *a, **k: None
            _rows = _t.ModuleType('psycopg.rows'); _rows.dict_row = object()
            sys.modules['psycopg.rows'] = _rows
            _sql = _t.ModuleType('psycopg.sql')
            class _FakeSQL:
                def __init__(self, *a, **k): pass
                def format(self, *a, **k): return self
            _sql.SQL = _FakeSQL
            _sql.Identifier = lambda *a, **k: _FakeSQL()
            _m.sql = _sql
            sys.modules['psycopg.sql'] = _sql
from werkzeug.exceptions import HTTPException as Abort

# --- db falso (SQLite) ---
con = sqlite3.connect(':memory:'); con.row_factory = lambda c, r: {d[0]: r[i] for i, d in enumerate(c.description)}
con.executescript("""
CREATE TABLE athletes(id INTEGER PRIMARY KEY AUTOINCREMENT,name,nickname,photo,hand DEFAULT 'destro',play_style DEFAULT 'classica',game_style DEFAULT 'ataque',elo INT DEFAULT 1000,wins INT DEFAULT 0,losses INT DEFAULT 0,tournaments_won INT DEFAULT 0,tournaments_second INT DEFAULT 0,tournaments_third INT DEFAULT 0,club,birth_date,blade,rubber_fh,rubber_bh,bio,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE tournaments(id INTEGER PRIMARY KEY AUTOINCREMENT,name,date,type,points_per_set,best_of,status DEFAULT 'active',champion_id,location,seeding DEFAULT 'random',third_place INT DEFAULT 0);
CREATE TABLE tournament_players(tournament_id,athlete_id);
CREATE TABLE matches(id INTEGER PRIMARY KEY AUTOINCREMENT,player1_id,player2_id,player1_name,player2_name,modality,mode,points_per_set,best_of,sets_json,sets_p1,sets_p2,winner,duration,tournament_id,tournament_match INT DEFAULT 0,notes,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE tournament_matches(id INTEGER PRIMARY KEY AUTOINCREMENT,tournament_id,round,position,player1_id,player2_id,winner_id,match_id,status DEFAULT 'waiting',third_place INT DEFAULT 0);
CREATE TABLE elo_history(id INTEGER PRIMARY KEY AUTOINCREMENT,athlete_id,match_id,delta,elo_after,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE admin_credentials(id INTEGER PRIMARY KEY CHECK (id=1),password_hash TEXT NOT NULL,auth_version INT NOT NULL DEFAULT 1,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
""")
def _c(sql, args):
    # SQLite não tem ILIKE; o app usa ILIKE no PostgreSQL para busca sem diferenciar maiúsculas.
    return sql.replace('ILIKE', 'LIKE').replace('%s', '?'), [a.isoformat() if isinstance(a, datetime.date) else a for a in args]
def q(sql, args=(), one=False):
    s, a = _c(sql, args); cur = con.execute(s, a); return cur.fetchone() if one else cur.fetchall()
def x(sql, args=()):
    s, a = _c(sql, args); return con.execute(s, a).lastrowid

import app as APP
T = M = A = APP
_real = (APP.jsonify, APP.request)
APP.q, APP.x = q, x
APP.jsonify = lambda *a, **k: (k or (a[0] if a else None))
x("INSERT INTO admin_credentials (id, password_hash, auth_version) VALUES (1, %s, 1)",
  (APP._hash_admin_password(os.environ['ADMIN_PASSWORD']),))
ADMIN_TOKEN = APP._admin_serializer().dumps({'role': 'admin', 'av': 1})
import random
fl = types.SimpleNamespace()

def post(mod_fn, payload):
    APP.request = types.SimpleNamespace(args={}, get_json=lambda silent=True, force=False: payload,
                                        headers={'X-Admin-Token': ADMIN_TOKEN}, remote_addr='127.0.0.1')
    return mod_fn()


def put(mod_fn, payload, *args):
    APP.request = types.SimpleNamespace(args={}, get_json=lambda silent=True, force=False: payload,
                                        headers={'X-Admin-Token': ADMIN_TOKEN}, remote_addr='127.0.0.1')
    return mod_fn(*args)

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

# somente sets de 5+ pontos valem ELO
p3, q3 = [x("INSERT INTO athletes(name) VALUES (%s)", (n,)) for n in ('P3', 'Q3')]
r = post(M.create_match, {'player1': {'athlete_id': p3}, 'player2': {'athlete_id': q3},
                          'points_per_set': 3, 'best_of': 1, 'sets': [[3, 1]]})[0]
assert r['elo'] is None and not q("SELECT id FROM elo_history WHERE match_id=%s", (r['id'],))
assert q("SELECT wins FROM athletes WHERE id=%s", (p3,), one=True)['wins'] == 1
p5, q5 = [x("INSERT INTO athletes(name) VALUES (%s)", (n,)) for n in ('P5', 'Q5')]
r = post(M.create_match, {'player1': {'athlete_id': p5}, 'player2': {'athlete_id': q5},
                          'points_per_set': 5, 'best_of': 1, 'sets': [[5, 3]]})[0]
assert r['elo'] and r['elo']['player1']['delta'] > 0 and r['elo']['player2']['delta'] < 0

# pesos: experiência, equilíbrio e zebra
assert APP._experience_factor(5, 5, 5, 5) < APP._experience_factor(40, 50, 40, 50)
assert APP._closeness_factor([[11, 1], [11, 2]], 11) < APP._closeness_factor([[11, 9], [11, 10]], 11)
assert APP._upset_factor(1000, 1200) > APP._upset_factor(1200, 1000)
base_match = {'points_per_set': 11, 'sets_json': [[11, 9], [11, 7]], 'winner': 1}
a1 = {'elo': 1000, 'wins': 20, 'losses': 20}
a2 = {'elo': 1000, 'wins': 20, 'losses': 20}
casual_delta = APP._match_elo_deltas(base_match, a1, a2)[0]
tournament_delta = APP._match_elo_deltas({**base_match, 'tournament_match': 1}, a1, a2)[0]
assert APP.K_TOURNAMENT == 2 * APP.K_MATCH and tournament_delta > casual_delta > 0, (casual_delta, tournament_delta)
print('partidas avulsas/validações ok; ELO só em 5+ pontos; torneio vale mais; pesos ok')

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
assert r['elo'] is None and not q("SELECT id FROM elo_history WHERE match_id=%s", (r['id'],))
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

# ---- corrigir placar de partida avulsa (e recalcular os pontos) ----
e1, e2 = [x("INSERT INTO athletes(name) VALUES (%s)", (n,)) for n in ('Edit1', 'Edit2')]
r = post(M.create_match, {'player1': {'athlete_id': e1}, 'player2': {'athlete_id': e2},
                          'points_per_set': 11, 'best_of': 3, 'sets': [[11, 9], [11, 7]],
                          'duration': 300})[0]
assert r['winner'] == 1 and r['elo']['player1']['delta'] > 0
r2 = put(M.update_match, {'sets': [[9, 11], [7, 11]], 'duration': 240, 'notes': 'corrigida'}, r['id'])
assert r2['winner'] == 2 and r2['sets_p1'] == 0 and r2['sets_p2'] == 2, r2
assert r2['elo']['player1']['delta'] < 0 and r2['elo']['player2']['delta'] > 0, r2
hist = q("SELECT athlete_id, delta FROM elo_history WHERE match_id=%s ORDER BY athlete_id", (r['id'],))
assert len(hist) == 2 and next(h for h in hist if h['athlete_id'] == e2)['delta'] > 0, hist
assert q("SELECT wins, losses FROM athletes WHERE id=%s", (e1,), one=True) == {'wins': 0, 'losses': 1}
assert q("SELECT wins, losses FROM athletes WHERE id=%s", (e2,), one=True) == {'wins': 1, 'losses': 0}
assert q("SELECT notes, duration FROM matches WHERE id=%s", (r['id'],), one=True) == {'notes': 'corrigida', 'duration': 240}
APP.request = types.SimpleNamespace(args={})
listed = next(m for m in M.list_matches() if m['id'] == r['id'])
assert listed['elo_p1'] < 0 and listed['elo_p2'] > 0, listed
prof = A.get_athlete(e2)
assert prof['recent'][0]['id'] == r['id'] and prof['recent'][0]['elo_delta'] > 0, prof['recent'][0]
hist_entry = prof['elo_history'][-1]
assert hist_entry['match_id'] == r['id'] and hist_entry['opponent'] == 'Edit1' and hist_entry['result'] == 'W', hist_entry
assert hist_entry['sets'] == [[11, 9], [11, 7]] and hist_entry['sets_me'] == 2 and hist_entry['sets_opp'] == 0, hist_entry
assert prof['stats']['elo_matches'] == 1, prof['stats']

# comparativo: perfil completo dos dois lados, confronto direto e forma recente
APP.request = types.SimpleNamespace(args={'a': str(e1), 'b': str(e2)})
cmp = A.compare_athletes()
assert cmp['a']['athlete']['id'] == e1 and cmp['b']['athlete']['id'] == e2, cmp
assert cmp['h2h']['matches'] == 1 and cmp['h2h']['a_wins'] == 0 and cmp['h2h']['b_wins'] == 1, cmp['h2h']
assert cmp['h2h']['a_sets'] == 0 and cmp['h2h']['b_sets'] == 2, cmp['h2h']
assert cmp['h2h']['recent'][0]['winner'] == 'b' and cmp['h2h']['recent'][0]['sets'] == [[9, 11], [7, 11]], cmp['h2h']['recent']
assert cmp['form'] == {'a': ['L'], 'b': ['W']}, cmp['form']
APP.request = types.SimpleNamespace(args={'a': str(e1), 'b': str(e1)})
try: A.compare_athletes(); raise SystemExit('comparativo deveria recusar o mesmo atleta')
except Abort as e: assert e.code == 400
print('histórico detalhado e comparativo ok')

# corrigir os pontos também pode transformar uma partida de 3 em 5+ pontos
r3 = post(M.create_match, {'player1': {'athlete_id': e1}, 'player2': {'athlete_id': e2},
                           'points_per_set': 3, 'best_of': 1, 'sets': [[3, 1]]})[0]
assert r3['elo'] is None
r4 = put(M.update_match, {'points_per_set': 11, 'best_of': 1, 'sets': [[11, 4]]}, r3['id'])
assert r4['elo'] and r4['elo']['player1']['delta'] > 0, r4

# partidas de torneio ficam bloqueadas (a chave não pode ser inconsistente)
r5 = post(M.create_match, {'player1': {'athlete_id': e1}, 'player2': {'athlete_id': e2},
                           'points_per_set': 3, 'best_of': 1, 'sets': [[3, 2]]})[0]
x("UPDATE matches SET tournament_match=1 WHERE id=%s", (r5['id'],))
try: put(M.update_match, {'sets': [[2, 3]]}, r5['id']); raise SystemExit('deveria bloquear torneio')
except Abort as e: assert e.code == 409
x("UPDATE matches SET tournament_match=0 WHERE id=%s", (r5['id'],))
print('correção de partidas e pontos no histórico ok')

# ---- servidor: index, conteúdo e isolamento de arquivos sensíveis (sem PostgreSQL real) ----
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

# comparativo público: dois atletas, mesmo atleta bloqueado e atleta inexistente
compare = c.get(f'/api/compare?a={e1}&b={e2}')
assert compare.status_code == 200, compare.status_code
compare_data = compare.get_json()
assert compare_data['a']['athlete']['id'] == e1 and compare_data['b']['athlete']['id'] == e2, compare_data
assert compare_data['h2h']['matches'] >= 1, compare_data['h2h']
assert compare_data['a']['elo_history'][0]['opponent'] == 'Edit2', compare_data['a']['elo_history']
assert c.get(f'/api/compare?a={e1}&b={e1}').status_code == 400
assert c.get('/api/compare?a=999999&b=1').status_code == 404
assert c.get('/api/compare').status_code == 400

# troca de senha: exige a atual, grava hash e invalida o token anterior
new_pass = 'nova-senha-forte-2026'
assert c.post('/api/admin/password', json={'current_password': 'errada', 'new_password': new_pass,
                                           'confirm_password': new_pass}, headers=H).status_code == 401
assert c.post('/api/admin/password', json={'current_password': os.environ['ADMIN_PASSWORD'],
                                           'new_password': 'curta', 'confirm_password': 'curta'},
              headers=H).status_code == 400
assert c.post('/api/admin/password', json={'current_password': os.environ['ADMIN_PASSWORD'],
                                           'new_password': new_pass, 'confirm_password': new_pass + 'x'},
              headers=H).status_code == 400
changed = c.post('/api/admin/password', json={'current_password': os.environ['ADMIN_PASSWORD'],
                                              'new_password': new_pass, 'confirm_password': new_pass},
                 headers=H)
assert changed.status_code == 200, changed.status_code
NEW_TOKEN = changed.get_json()['token']
assert c.get('/api/admin/check', headers=H).get_json()['admin'] is False
assert c.get('/api/admin/check', headers={'X-Admin-Token': NEW_TOKEN}).get_json()['admin'] is True
assert c.post('/api/admin/login', json={'password': os.environ['ADMIN_PASSWORD']}).status_code == 401
assert c.post('/api/admin/login', json={'password': new_pass}).status_code == 200
row = q("SELECT password_hash, auth_version FROM admin_credentials WHERE id=1", one=True)
assert row['auth_version'] == 2 and row['password_hash'].startswith('scrypt:')
assert new_pass not in row['password_hash']

assert len(c.get('/api/estudo').get_json()) > 0 and set(c.get('/api/regras').get_json()) == {'ittf', 'local', 'sistema'}
assert all(len(v) >= 6 for v in c.get('/api/regras').get_json().values())
for secret in ('/.env', '/app.py', '/conteudo.json', '/.env.example'):
    assert c.get(secret).status_code == 404, secret
print('servidor/índice/conteúdo ok; arquivos sensíveis não são expostos')
