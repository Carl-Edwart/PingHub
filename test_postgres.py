"""Teste de integração real com PostgreSQL.

Use um banco DESCARTÁVEL. O script cria um schema temporário, roda a API com o
Flask test client e remove o schema ao final. Nunca aponte para produção.

    PINGHUB_TEST_DB=1 DATABASE_URL=postgresql://... python test_postgres.py
"""
import os
import secrets
import sys
from concurrent.futures import ThreadPoolExecutor

if os.getenv("PINGHUB_TEST_DB") != "1":
    sys.exit("Defina PINGHUB_TEST_DB=1 e use um DATABASE_URL de teste/descartável.")

os.environ["PINGHUB_ENV"] = "production"
os.environ["SECRET_KEY"] = "test-only-secret-key-" + "x" * 32
os.environ["ADMIN_PASSWORD"] = "test-only-admin-password"
os.environ["DB_AUTO_INIT"] = "0"
os.environ["DB_INIT_ON_START"] = "1"
os.environ.pop("PGOPTIONS", None)

import psycopg  # noqa: E402
from psycopg.rows import dict_row  # noqa: E402

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if not DATABASE_URL:
    sys.exit("Defina DATABASE_URL apontando para um PostgreSQL de teste.")

SCHEMA = "pinghub_test_" + secrets.token_hex(6)
with psycopg.connect(DATABASE_URL, autocommit=True) as con:
    con.execute(f'CREATE SCHEMA "{SCHEMA}"')
    empty = con.execute(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s",
        (SCHEMA,),
    ).fetchone()[0]
assert empty == 0, "o schema de teste deveria começar vazio"

os.environ["DB_SCHEMA"] = SCHEMA


def expect(response, code=200):
    assert response.status_code == code, (response.status_code, response.get_data(as_text=True)[:800])
    return response.get_json()


try:
    # DB_INIT_ON_START=1: o import já inicializa o schema vazio, como no boot
    # do Gunicorn. Não deve ser necessário chamar init_db() antes da 1ª rota.
    import app as APP  # noqa: E402

    with APP._connect(row_factory=dict_row) as con, con.cursor() as cur:
        cur.execute("SELECT current_schema() AS schema, current_setting('search_path') AS path")
        effective = cur.fetchone()
        assert effective["schema"] == SCHEMA, effective
        assert effective["path"] == SCHEMA, effective
        cur.execute(
            "SELECT COUNT(*) AS total FROM information_schema.tables "
            "WHERE table_schema = %s AND table_type = 'BASE TABLE'",
            (SCHEMA,),
        )
        assert cur.fetchone()["total"] == len(APP.EXPECTED_TABLES)

    # Reinicialização explícita no mesmo schema: idempotente, sem duplicar nada.
    APP.init_db()
    client = APP.app.test_client()

    assert expect(client.get("/health"))["status"] == "ok"
    assert expect(client.get("/health/db"))["status"] == "ok"
    assert expect(client.get("/api/stats"))["athletes"] == 0
    assert expect(client.get("/api/ranking")) == []

    login = expect(client.post("/api/admin/login", json={"password": os.environ["ADMIN_PASSWORD"]}))
    admin = {"X-Admin-Token": login["token"]}
    suffix = secrets.token_hex(3)

    ana = expect(client.post("/api/athletes", json={"name": f"Atleta Smoke {suffix}"}, headers=admin), 201)
    beto = expect(client.post("/api/athletes", json={"name": f"Beto Smoke {suffix}"}, headers=admin), 201)

    # ILIKE: a busca deve funcionar em minúsculas no PostgreSQL.
    found = expect(client.get("/api/athletes?q=atleta%20smoke"))
    assert any(a["id"] == ana["id"] for a in found), found

    match = expect(client.post("/api/matches", json={
        "player1": {"athlete_id": ana["id"]},
        "player2": {"athlete_id": beto["id"]},
        "points_per_set": 3,
        "best_of": 1,
        "sets": [[3, 1]],
    }), 201)
    assert match["winner"] == 1 and match["elo"]["player1"]["delta"] > 0, match

    ranking = expect(client.get("/api/ranking"))
    assert ranking[0]["id"] == ana["id"] and ranking[0]["elo"] > ranking[1]["elo"], ranking

    tournament = expect(client.post("/api/tournaments", json={
        "name": f"Torneio Smoke {suffix}",
        "type": "knockout",
        "athlete_ids": [ana["id"], beto["id"]],
        "points_per_set": 3,
        "best_of": 1,
    }, headers=admin), 201)
    detail = expect(client.get(f"/api/tournaments/{tournament['id']}"))
    game = next(m for m in detail["matches"] if m["player1_id"] and m["player2_id"])
    result = expect(client.post("/api/matches", json={
        "tournament_match_id": game["id"],
        "sets": [[3, 0]],
    }), 201)
    assert result["tournament_result"]["tournament"]["status"] == "finished", result
    expect(client.get(f"/api/tournaments/{tournament['id']}"), 404)

    expect(client.post("/api/mesa/occupy", json={"name": "Smoke", "minutes": 1}))
    expect(client.post("/api/mesa/release"))
    expect(client.post("/api/mesa/queue", json={"name": "Smoke"}), 201)
    expect(client.post("/api/mesa/next"))

    stats = expect(client.get("/api/stats"))
    assert stats["athletes"] == 2 and stats["matches"] == 2 and stats["tournaments"] == 0, stats

    # Reinicializações repetidas e concorrentes não podem apagar/duplicar dados.
    def counts():
        with APP._connect(row_factory=dict_row) as con, con.cursor() as cur:
            cur.execute(
                "SELECT (SELECT COUNT(*) FROM athletes) AS athletes, "
                "(SELECT COUNT(*) FROM matches) AS matches, "
                "(SELECT COUNT(*) FROM tournaments) AS tournaments"
            )
            return cur.fetchone()

    before = counts()
    APP.init_db()
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: APP.init_db(), range(4)))
    assert counts() == before, (before, counts())
    assert expect(client.get(f"/api/athletes/{ana['id']}"))["athlete"]["name"] == ana["name"]

    # Falha de conexão vira DatabaseInitError sanitizado, sem vazar credenciais.
    leaked = "senha-" + secrets.token_hex(8)
    original_url = os.environ["DATABASE_URL"]
    os.environ["DATABASE_URL"] = f"postgresql://pinghub:{leaked}@127.0.0.1:1/pinghub"
    try:
        try:
            APP.init_db()
        except APP.DatabaseInitError as exc:
            assert "Falha ao inicializar o schema PostgreSQL" in str(exc), exc
            assert leaked not in str(exc), exc
        else:
            raise AssertionError("init_db deveria falhar com o banco inacessível")
    finally:
        os.environ["DATABASE_URL"] = original_url

    # Falha de migração: uma view ocupa o nome de uma tabela esperada.
    conflict = "pinghub_conflict_" + secrets.token_hex(4)
    with psycopg.connect(original_url, autocommit=True) as con:
        con.execute(f'CREATE SCHEMA "{conflict}"')
        con.execute(f'CREATE VIEW "{conflict}".athletes AS SELECT 1 AS id')
    previous_schema = APP.DB_SCHEMA
    APP.DB_SCHEMA = conflict
    try:
        try:
            APP.init_db()
        except APP.DatabaseInitError as exc:
            assert conflict in str(exc), exc
        else:
            raise AssertionError("init_db deveria falhar com uma view no lugar da tabela")
    finally:
        APP.DB_SCHEMA = previous_schema
        with psycopg.connect(original_url, autocommit=True) as con:
            con.execute(f'DROP SCHEMA IF EXISTS "{conflict}" CASCADE')

    # Detecta dados em outro schema e aborta antes de criar tabelas vazias.
    other = "pinghub_other_" + secrets.token_hex(4)
    with psycopg.connect(original_url, autocommit=True) as con:
        con.execute(f'CREATE SCHEMA "{other}"')
    explicit = APP.DB_SCHEMA_EXPLICIT
    APP.DB_SCHEMA, APP.DB_SCHEMA_EXPLICIT = other, False
    try:
        try:
            APP.init_db()
        except APP.DatabaseInitError as exc:
            assert "DB_SCHEMA" in str(exc) and SCHEMA in str(exc), exc
        else:
            raise AssertionError("init_db deveria abortar ao achar 'athletes' em outro schema")
        with psycopg.connect(original_url, autocommit=True) as con:
            total = con.execute(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s",
                (other,),
            ).fetchone()[0]
            assert total == 0, "nenhuma tabela deveria ser criada no schema errado"
    finally:
        APP.DB_SCHEMA, APP.DB_SCHEMA_EXPLICIT = previous_schema, explicit
        with psycopg.connect(original_url, autocommit=True) as con:
            con.execute(f'DROP SCHEMA IF EXISTS "{other}" CASCADE')

    print("PostgreSQL ok: boot, schema, init repetido/concorrente, dados, falhas seguras, "
          "autenticação, atletas, busca, ELO, torneio e mesa.")
finally:
    with psycopg.connect(DATABASE_URL, autocommit=True) as con:
        con.execute("SET search_path = public")
        con.execute(f'DROP SCHEMA IF EXISTS "{SCHEMA}" CASCADE')
