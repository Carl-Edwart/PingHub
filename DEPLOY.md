# PingHub — produção e migração para PostgreSQL

O backend usa **PostgreSQL 16 + psycopg 3**. Ele não conecta a MySQL/MariaDB. A aplicação aplica o
esquema no boot (e o `init-db` faz o mesmo sob demanda) de forma **aditiva**, sem apagar tabelas ou
registros. Isso é idempotente e usa um advisory lock para múltiplos workers/instâncias. Ele não copia
dados do MySQL antigo: a migração de dados é um passo separado (veja abaixo).

## Checklist rápido

1. `SECRET_KEY` aleatória com 32+ caracteres e `ADMIN_PASSWORD` forte (12+), diferentes entre si.
2. `DATABASE_URL` PostgreSQL (não MySQL) apontando para o banco de produção.
3. `PINGHUB_ENV=production` e `TRUSTED_PROXY_COUNT` conforme a plataforma (Render/Railway: `1`).
4. Manter `DB_INIT_ON_START=1` (padrão) para aplicar o esquema no boot; `python app.py init-db`
   faz o mesmo manualmente. Não crie tabelas no painel do Render.
5. Testar `GET /health`, `GET /health/db`, `GET /api/stats` e as demais rotas de leitura.
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
| `DB_SCHEMA` | não | schema das tabelas (padrão `public`); defina apenas se os dados já estiverem em outro schema |
| `DB_INIT_ON_START` | não | aplica o esquema no boot (padrão `1`); funciona com `gunicorn app:app` direto |
| `DB_AUTO_INIT` | não | fallback legado desligado por padrão em produção; inicializa na 1ª chamada `/api` |
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

O `render.yaml` declara o serviço web, o PostgreSQL, o health check e as variáveis. A aplicação
aplica o schema no boot (`DB_INIT_ON_START=1`), inclusive quando a plataforma executa
`gunicorn app:app` diretamente. O comando de início recomendado é `scripts/start.sh`, que roda
`python app.py init-db` (com retry para banco lento) e depois o Gunicorn; a inicialização do boot é
a rede de segurança. Tudo funciona no plano free, onde o **pre-deploy command não está disponível**.

Múltiplos workers e reinícios são seguros: o `init_db()` usa `CREATE ... IF NOT EXISTS`, migrações
condicionais e um advisory lock transacional. Nenhum caminho executa `DROP TABLE`/`TRUNCATE`.

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
   banco criado. O comando de start pode ser `./scripts/start.sh` ou `gunicorn app:app`: os dois
   inicializam o schema no boot.
5. Health check: `/health`. Não é necessário criar tabelas manualmente.

### Limitações do plano free

O plano free é útil para demonstração, **não para produção de um clube**:

- O serviço hiberna após 15 minutos sem tráfego (o primeiro acesso demora ~1 min).
- O PostgreSQL free expira **30 dias após a criação** e não oferece backup gerenciado.
- Há limite de 1 GB de banco e 750 horas de instância por mês.

Antes do vencimento, faça upgrade do banco para um plano pago no painel do Render. Se quiser
antecipar a inicialização no plano pago, o pre-deploy é opcional (o boot já inicializa):

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
- `GET /api/stats`, `/api/mesa`, `/api/matches?limit=5` e `/api/ranking` — leituras reais pelo
  Flask/psycopg, que falham com 503 se o schema estiver ausente.

Teste também o login admin, o cadastro de um atleta, uma partida e o ranking. Em caso de erro,
veja os logs da plataforma; as mensagens não expõem a `DATABASE_URL`.

## Erro `UndefinedTable` / SQLSTATE 42P01

Esse erro significa que a conexão funcionou, mas as consultas não encontraram as tabelas no
`search_path` efetivo. A causa típica é o processo subir sem executar `init_db()` (por exemplo,
`DB_INIT_ON_START=0` e nenhum `init-db` antes do Gunicorn) ou apontar para outro banco/schema.

1. Nos logs, procure `Inicializando schema PostgreSQL`, `Schema efetivo: ...` e
   `Schema PostgreSQL ... pronto`. O alvo registrado mostra host/porta/banco, nunca a senha.
2. Confirme que a `DATABASE_URL` do serviço é a do PostgreSQL correto e que `DB_SCHEMA` (padrão
   `public`) é o schema onde estão os dados.
3. Reinicie/redeploy o serviço com `DB_INIT_ON_START=1`. A inicialização roda no boot, antes de
   depender de qualquer requisição HTTP.
4. Se as tabelas já existem em **outro schema**, defina `DB_SCHEMA` para ele e reinicie. Sem
   `DB_SCHEMA`, a aplicação aborta em vez de criar tabelas vazias em `public`; não copie nem apague
   dados manualmente.
5. Só use `python app.py init-db` como diagnóstico/execução manual. Ele é idempotente e aditivo.

## Inicializar um banco existente sem perder dados

- **Banco vazio:** basta fazer deploy/reiniciar. O boot cria as 8 tabelas, colunas e índices.
- **Banco já com o esquema do PingHub:** nenhuma ação especial; o boot adiciona apenas colunas e
  índices que faltam. Faça backup antes de qualquer atualização relevante.
- **Dados em outro schema:** configure `DB_SCHEMA` com esse schema. A aplicação usa exatamente
  esse valor em todas as conexões e não cria duplicatas em `public`.
- **Nunca** execute `DROP TABLE`, `TRUNCATE` ou recrie tabelas para "corrigir" o 42P01. Se houver
  dúvida, faça backup com `scripts/backup_db.sh` e valide a restauração antes de mudar variáveis.

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
