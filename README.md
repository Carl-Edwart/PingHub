# PingHub

Site de tênis de mesa: placar ao vivo, torneios, ranking ELO, atletas, estudo, regras e fila da mesa.

[![CI](https://github.com/Carl-Edwart/PingHub/actions/workflows/ci.yml/badge.svg)](https://github.com/Carl-Edwart/PingHub/actions/workflows/ci.yml)

**Stack:** PostgreSQL 16 · Flask + psycopg 3 · frontend em HTML/CSS/JS puro (SPA com rotas `#/`) · Bootstrap 5 só para grid e utilitários.

## Rodar localmente

### Com Docker

```bash
docker compose up -d                 # PostgreSQL 16 em 127.0.0.1:5432
cp .env.example .env                 # somente se ainda não existir .env
./run.sh                             # cria a .venv, instala e sobe em http://localhost:5000
```

### Sem Docker (PostgreSQL local)

O script cria um cluster PostgreSQL isolado em `~/.local/share/pinghub/postgresql` (porta 55433),
sem precisar de root ou Docker:

```bash
./scripts/dev_db.sh start
# copie a DATABASE_URL exibida para o .env
./run.sh
```

Se já existe um `.env`, não o sobrescreva: atualize nele `DATABASE_URL` (ou as variáveis `DB_*`)
para o PostgreSQL local e mantenha seus segredos. O `.env.example` serve apenas como modelo.

Antes de subir, defina no `.env` uma `ADMIN_PASSWORD` forte e uma `SECRET_KEY` aleatória. Gere o
segredo com `python -c "import secrets; print(secrets.token_urlsafe(48))"`. A entrada é feita em
**Admin** no menu.

Manualmente:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PINGHUB_ENV=development python app.py
```

Em desenvolvimento, as tabelas PostgreSQL são criadas na primeira chamada à API. Para criar o
esquema antes de subir: `python app.py init-db`.

## Estrutura

```
app.py                 backend: config, PostgreSQL, esquema, ELO, chaves, API REST e frontend
index.html             frontend: marcação, tema (CSS) e telas (JS)
conteudo.json          técnicas de estudo e regras (ITTF + mesa local)
test_app.py            testes de torneios/partidas/ELO com banco simulado (sem PostgreSQL real)
test_production.py     contratos de configuração, segurança e deploy
test_postgres.py       teste de integração real (schema temporário, banco descartável)
gunicorn.conf.py       configuração do servidor de produção
render.yaml            Blueprint do Render (web + PostgreSQL)
railway.json           configuração alternativa do Railway
scripts/start.sh       init-db idempotente + Gunicorn (usado no deploy)
scripts/dev_db.sh      PostgreSQL local sem Docker
scripts/backup_db.sh   backup com pg_dump
scripts/restore_db.sh  restauração com pg_restore
scripts/smoke_test.sh  verificação pós-deploy (/health, /health/db, /api/stats)
DEPLOY.md              passo a passo de produção, migração e rollback
```

Dentro do `app.py` as seções são separadas por banners (`# ==== ATLETAS ====`, `TORNEIOS`,
`PARTIDAS`…). No `index.html`: `<style>` (paleta em `:root`, componentes, animações) e
`<script>` (núcleo, atletas, partida, ranking, torneio, info).

## Testes

```bash
./.venv/bin/python test_app.py
./.venv/bin/python test_production.py

# integração real: use um banco descartável, nunca produção
PINGHUB_TEST_DB=1 DATABASE_URL=postgresql://postgres@127.0.0.1:55433/pinghub \
  ./.venv/bin/python test_postgres.py
```

O `test_postgres.py` cria um schema temporário, testa a API de ponta a ponta e remove o schema.
O workflow `.github/workflows/ci.yml` roda os três conjuntos no GitHub Actions.

## Identidade visual

Paleta: grafite profundo (`--bg`, `--surface`) + **azul** (`--accent`: ações e navegação) +
**verde** (`--ok`: confirmar/iniciar, subida de ELO, vitória) + **vermelho** (`--bad`: queda de
ELO, derrota, mesa ocupada) + laranja (bolinha). Texto branco (`--text`). Jogador 1 = azul
(`--p1`), jogador 2 = laranja (`--p2`), para nunca confundir com ganhar/perder. Brilhos
discretos; o foco está no movimento de botões e ícones. Para trocar o tema, altere só as
variáveis no topo do `<style>`. Animações respeitam `prefers-reduced-motion`.

## Recursos

- **Atletas:** clube, data de nascimento (idade automática), madeira, borrachas FH/BH e bio.
  Perfil com gráfico de ELO em verde (subiu) e vermelho (caiu), **valor do ELO visível em cada
  ponto**, pontos marcados/sofridos, sequência atual e maior sequência, ELO máximo, duração média
  e rival frequente.
- **Partida:** seletores em botões (modo, modalidade, pontos, melhor de), observações, aviso de
  *ponto de set* e *ponto de partida* (só no modo competitivo), **indicador de posse do saque a
  partir de 7 pontos** (2 a 2; 1 a 1 após 10-10), troca de lado no set decisivo, atalhos de
  teclado (← → pontuam, Backspace desfaz) e 1 time-out de 60 s por jogador, com os botões no topo
  do placar e o aviso centralizado apenas enquanto está ativo.
- **Cooperativo:** apenas tempo (minutos), sem pontos, sets, vencedor, ELO ou avisos de ponto.
- **Torneios:** local, sorteio da chave aleatório ou por **cabeças de chave segundo o ELO** e
  **disputa opcional de 3º lugar** em eliminatórias com 4+ atletas. Ao terminar, o resumo
  completo (pódio e resultados) é exibido e o evento é removido automaticamente; títulos,
  partidas e ELO continuam salvos.
- **Histórico:** todas as partidas com busca, detalhe dos sets, torneio, duração e exportação CSV.
- **Regras:** ~30 regras ITTF (saque, jogo, duplas, equipamento, arbitragem), regras da mesa local
  e a aba **Regras do sistema** (como o ELO, as chaves e o placar funcionam). Tudo editável em
  `conteudo.json`.
- **Início:** números gerais (atletas, partidas, torneios, sets).
- Bancos já existentes são atualizados sozinhos (as colunas novas são adicionadas na primeira
  requisição ou no `init-db`).

## API (resumo)

| Recurso | Rotas |
|---|---|
| Atletas | `GET/POST /api/athletes` · `GET/PUT/DELETE /api/athletes/<id>` · `GET /api/athletes/<id>/photo` |
| Partidas | `POST /api/matches` (vencedor, ELO e avanço do torneio) · `GET /api/matches?limit=&q=` |
| Estatísticas | `GET /api/stats` |
| Ranking | `GET /api/ranking?q=` · `GET /api/export/ranking.csv` · `GET /api/export/matches.csv` |
| Torneios | `GET/POST /api/tournaments` · `GET/DELETE /api/tournaments/<id>` |
| Conteúdo | `GET /api/estudo?level=&category=` · `GET /api/regras?q=&category=` |
| Mesa | `GET /api/mesa` · `POST /api/mesa/occupy` · `/release` · `/queue` · `/next` · `DELETE /api/mesa/queue/<id>` |
| Administração | `POST /api/admin/login` · `GET /api/admin/check` |
| Saúde | `GET /health` · `GET /health/db` |

## Segurança e permissões

- **Todos (free):** consultar ranking, atletas, histórico, conteúdo e mesa; criar e salvar
  partidas; usar a fila da mesa.
- **Administrador:** alterar/criar/excluir atletas e criar/excluir torneios.
- O login usa `ADMIN_PASSWORD` (definida no `.env`) e devolve um token assinado com `SECRET_KEY`,
  válido por `ADMIN_TOKEN_HOURS` (12 por padrão). O token vai no cabeçalho `X-Admin-Token`; não há
  cookie de sessão.
- `POST /api/admin/login` tem limite de tentativas por IP (`ADMIN_LOGIN_MAX` em
  `ADMIN_LOGIN_WINDOW` segundos; 5 em 15 min por padrão).
- Sem `ADMIN_PASSWORD` e `SECRET_KEY` a área administrativa fica indisponível. Nunca versionar o
  `.env`.

## Regras de negócio

- Em partida competitiva o servidor valida o placar: cada set termina em N pontos (2 de vantagem a
  partir de 11) e a partida só é salva decidida.
- Set até N pontos (3–21); acima de 11 exige 2 de vantagem. Saque troca a cada 2 pontos (a cada 1
  após 10-10).
- Partida avulsa começa com sets de 3 pontos e melhor de 1; torneios usam a configuração escolhida
  na criação.
- **Cooperativo** aceita apenas duração: não salva sets, não define vencedor e não altera ELO.
- ELO (K=32 avulsa, K=16 torneio, inicial 1000) só muda em partida **competitiva individual entre
  dois atletas cadastrados**.
- Ao salvar o resultado de um torneio o vencedor avança na chave. Em eliminatórias com 4+ atletas,
  o administrador pode ativar a disputa de 3º lugar; sem ela, os dois semifinalistas derrotados
  ficam empatados em 3º.
- Quando a última partida do torneio (incluindo a disputa de 3º lugar, se houver) termina, o resumo
  completo é devolvido e o evento é excluído automaticamente. Títulos, partidas e ELO permanecem.
- Mesa e ranking são compartilhados entre todos os aparelhos (a tela da Mesa atualiza a cada 5 s).

## Deploy

O caminho recomendado é o **Render Blueprint** (`render.yaml`), que cria o serviço web e um
PostgreSQL 16 já conectado:

1. Abra <https://render.com/deploy?repo=https://github.com/Carl-Edwart/PingHub>.
2. Autorize o GitHub, escolha o workspace e informe uma `ADMIN_PASSWORD` forte.
3. Confirme a criação. O Render gera a `SECRET_KEY` e injeta a `DATABASE_URL`.
4. Depois do deploy, rode `./scripts/smoke_test.sh https://SEU-SERVICO.onrender.com`.

O plano free do Render serve para teste: o serviço hiberna após 15 min sem tráfego e o PostgreSQL
free **expira em 30 dias** e não tem backup. Para uso real do clube, suba o banco para um plano pago
antes do vencimento (veja `DEPLOY.md`). O Railway também é suportado por `railway.json`.

Passo a passo completo, variáveis, migração MySQL → PostgreSQL, backup e rollback: **[DEPLOY.md](DEPLOY.md)**.

## Backup e restauração

Configure `DATABASE_URL` no `.env` (ou exporte no terminal) e execute:

```bash
./scripts/backup_db.sh
./scripts/restore_db.sh backups/ARQUIVO.dump
```

O backup fica em `backups/` (ignorado pelo Git). A restauração pode sobrescrever dados; faça outro
backup antes e mantenha cópias fora deste computador.

## Licença

[MIT](LICENSE) © 2026 Carl-Edwart
