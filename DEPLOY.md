# PingHub — produção e migração para PostgreSQL

O backend usa **PostgreSQL 16 + psycopg 3**. Ele não conecta a MySQL/MariaDB. O `init-db` cria ou
completa o esquema PostgreSQL de forma **aditiva**, sem apagar tabelas ou registros. Ele não copia
dados do MySQL antigo: a migração de dados é um passo separado (veja abaixo).

## Checklist rápido

1. `SECRET_KEY` aleatória com 32+ caracteres e `ADMIN_PASSWORD` forte (12+), diferentes entre si.
2. `DATABASE_URL` PostgreSQL (não MySQL) apontando para o banco de produção.
3. `PINGHUB_ENV=production` e `TRUSTED_PROXY_COUNT` conforme a plataforma (Render/Railway: `1`).
4. Rodar `python app.py init-db` antes de liberar tráfego.
5. Testar `GET /health`, `GET /health/db` e `GET /api/stats`.
6. Fazer backup depois da validação e manter uma cópia fora da plataforma.

## Variáveis de ambiente

| Variável | Obrigatória | Observação |
|---|---|---|
| `DATABASE_URL` | sim¹ | URL PostgreSQL da plataforma; nunca use URL MySQL |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | sim¹ | alternativa quando não há `DATABASE_URL` |
| `SECRET_KEY` | sim | 32+ caracteres aleatórios; assina o token admin |
| `ADMIN_PASSWORD` | sim | 12+ caracteres; senha da área administrativa |
| `PINGHUB_ENV` | recomendada | use `production` em produção |
| `PORT` | plataforma | Render/Railway injetam automaticamente |
| `TRUSTED_PROXY_COUNT` | recomendada | número de proxies confiáveis à frente do app (1 em Render/Railway) |
| `DB_AUTO_INIT` | não | desligado por padrão em produção; o deploy roda `init-db` |
| `ADMIN_TOKEN_HOURS` | não | validade do token admin (12 h por padrão) |
| `ADMIN_LOGIN_WINDOW`, `ADMIN_LOGIN_MAX` | não | janela e limite de tentativas de login (900 s / 5) |
| `WEB_CONCURRENCY`, `GUNICORN_THREADS` | não | 1 worker e 8 threads por padrão |
| `LOG_LEVEL` | não | `INFO` por padrão |

¹ Use `DATABASE_URL` **ou** o conjunto `DB_*`. Em produção, variáveis ausentes ou segredos
fracos impedem a inicialização. As mensagens de erro não mostram a URL nem a senha do banco.

Gere segredos localmente:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

## Deploy no Render (recomendado)

O `render.yaml` declara o serviço web, o PostgreSQL, o health check e as variáveis. O comando de
início é `scripts/start.sh`, que roda `python app.py init-db` (com retry) e depois o Gunicorn. Isso
funciona no plano free, onde o **pre-deploy command não está disponível**.

### Pelo Blueprint (um clique)

1. Abra <https://render.com/deploy?repo=https://github.com/Carl-Edwart/PingHub>.
2. Autorize o GitHub e selecione o workspace.
3. Informe uma `ADMIN_PASSWORD` forte quando o Render solicitar (`sync: false`).
4. Confirme a criação. O Render gera a `SECRET_KEY` e injeta a `DATABASE_URL` do banco
   `pinghub-db`.
5. Acompanhe o deploy e confira os logs de `init-db` e do Gunicorn.

### Pelo painel (manual)

1. **New → PostgreSQL**: crie o banco (PostgreSQL 16), mesma região do serviço.
2. **New → Web Service**: conecte o repositório `Carl-Edwart/PingHub`, branch `main`.
3. Runtime Python, build `pip install -r requirements.txt`, start `./scripts/start.sh`.
4. Adicione as variáveis da tabela acima; em `DATABASE_URL`, use a connection string interna do
   banco criado.
5. Health check: `/health`.

### Limitações do plano free

O plano free é útil para demonstração, **não para produção de um clube**:

- O serviço hiberna após 15 minutos sem tráfego (o primeiro acesso demora ~1 min).
- O PostgreSQL free expira **30 dias após a criação** e não oferece backup gerenciado.
- Há limite de 1 GB de banco e 750 horas de instância por mês.

Antes do vencimento, faça upgrade do banco para um plano pago no painel do Render. Se quiser usar
pre-deploy no plano pago, troque no `render.yaml`/painel:

```yaml
preDeployCommand: python app.py init-db
startCommand: gunicorn app:app
```

## Deploy no Railway (alternativa)

1. Crie um projeto e um serviço PostgreSQL.
2. Conecte o repositório; o `railway.json` define `./scripts/start.sh` e o health check `/health`.
3. Defina `DATABASE_URL` (referência ao PostgreSQL), `SECRET_KEY`, `ADMIN_PASSWORD`,
   `PINGHUB_ENV=production` e `TRUSTED_PROXY_COUNT=1`.
4. Faça o deploy e rode o smoke test.

## Verificação pós-deploy

```bash
./scripts/smoke_test.sh https://SEU-SERVICO.onrender.com
```

O script confere:

- `GET /health` — processo respondendo.
- `GET /health/db` — conectividade e existência do esquema; retorna 503 sem detalhes internos.
- `GET /api/stats` — leitura real pelo Flask/psycopg.

Teste também o login admin, o cadastro de um atleta, uma partida e o ranking. Em caso de erro,
veja os logs da plataforma; as mensagens não expõem a `DATABASE_URL`.

## Migração de dados MySQL → PostgreSQL

Não rode a aplicação apontada para o MySQL antigo e não deixe tráfego de escrita ativo durante a
cópia final. Faça primeiro um ensaio em um PostgreSQL descartável.

1. Faça e valide um backup do MySQL (estrutura e dados), sem alterar nem apagar a origem.
2. Crie o PostgreSQL de destino e configure `DATABASE_URL` apenas no ambiente de teste.
3. Execute `python app.py init-db` para criar o esquema esperado.
4. Migre os dados com uma ferramenta MySQL→PostgreSQL, mapeando as tabelas `athletes`,
   `tournaments`, `tournament_players`, `matches`, `tournament_matches`, `elo_history`,
   `mesa_state` e `mesa_queue`. Preserve IDs e relações; confira datas, JSON dos sets, nulos e os
   campos `mode`, `modality`, `winner` e `status`.
5. Depois de importar IDs explícitos, confirme que as sequências `SERIAL` do PostgreSQL avançam
   além dos maiores IDs importados.
6. Compare contagens por tabela e valide atletas, ranking/ELO, histórico, resultados e fila. Rode
   `test_app.py`, `test_production.py` e (em banco descartável) `test_postgres.py`.
7. Faça backup do destino já migrado e ensaie a restauração. Só então altere a `DATABASE_URL` do
   serviço, faça o deploy e confira os endpoints de saúde.
8. Mantenha o MySQL e o backup intactos até o período de observação terminar. Para reverter,
   restaure o tráfego para o sistema antigo; gravações feitas só no PostgreSQL não aparecem no
   MySQL.

Não use um dump MySQL diretamente em `pg_restore`: formatos e dialetos são diferentes. Uma
migração em duas fases (cópia inicial e sincronização final após pausar gravações) reduz a janela
sem escrita, mas exige sincronização sem duplicar IDs.

## Backup, restauração e rollback

```bash
export DATABASE_URL='postgresql://...'   # ou configure no .env
./scripts/backup_db.sh                   # salva em backups/pinghub-AAAAMMDD-HHMMSS.dump
./scripts/restore_db.sh backups/ARQUIVO.dump
```

- O backup usa `pg_dump --format=custom` e é verificado com `pg_restore --list`.
- A restauração pede confirmação e usa `--clean --if-exists`; ela **pode sobrescrever dados**.
- Guarde backups fora do computador/plataforma e teste a restauração periodicamente.
- Rollback de deploy: use a opção de rollback do Render/Railway ou faça um novo deploy do commit
  anterior. Rollback de dados: restaure o dump validado.

## Segurança operacional

- Nunca versione `.env`, dumps, backups ou credenciais. O `.gitignore` já cobre esses arquivos.
- Use senhas diferentes para banco, `SECRET_KEY` e `ADMIN_PASSWORD`.
- Mantenha o PostgreSQL sem acesso público quando a plataforma permitir (rede privada).
- Rode o app atrás de HTTPS; o Render/Railway já fornecem TLS.
- `TRUSTED_PROXY_COUNT=1` faz o limite de login usar o IP real do cliente; com `0`, o
  `X-Forwarded-For` é ignorado.
- Faça backup antes de qualquer migração ou restauração.
