"""Teste de integração real com PostgreSQL.

Use um banco DESCARTÁVEL. O script cria um schema temporário, roda a API com o
Flask test client e remove o schema ao final. Nunca aponte para produção.

    PINGHUB_TEST_DB=1 DATABASE_URL=postgresql://... python test_postgres.py
"""
import os
import secrets
import sys

if os.getenv("PINGHUB_TEST_DB") != "1":
    sys.exit("Defina PINGHUB_TEST_DB=1 e use um DATABASE_URL de teste/descartável.")

os.environ.setdefault("PINGHUB_ENV", "production")
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-" + "x" * 32)
os.environ.setdefault("ADMIN_PASSWORD", "test-only-admin-password")
os.environ.setdefault("DB_AUTO_INIT", "0")

import psycopg  # noqa: E402

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if not DATABASE_URL:
    sys.exit("Defina DATABASE_URL apontando para um PostgreSQL de teste.")

SCHEMA = "pinghub_test_" + secrets.token_hex(6)
with psycopg.connect(DATABASE_URL, autocommit=True) as con:
    con.execute(f'CREATE SCHEMA "{SCHEMA}"')

os.environ["PGOPTIONS"] = f"-c search_path={SCHEMA}"


def expect(response, code=200):
    assert response.status_code == code, (response.status_code, response.get_data(as_text=True)[:800])
    return response.get_json()


try:
    import app as APP  # noqa: E402  (precisa ser importado depois do PGOPTIONS)

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
    print("PostgreSQL ok: esquema, autenticação, atletas, busca, ELO, torneio e mesa.")
finally:
    with psycopg.connect(DATABASE_URL, autocommit=True) as con:
        con.execute("SET search_path = public")
        con.execute(f'DROP SCHEMA IF EXISTS "{SCHEMA}" CASCADE')
