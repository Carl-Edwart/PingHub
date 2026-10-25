# PingHub — Guia de produção (Railway ou plataforma equivalente)

Este guia assume o código desta pasta. Itens marcados **[não verificado]** dependem da sua conta/plataforma e não puderam ser testados no ambiente de desenvolvimento do código.

## 1. Como a aplicação roda em produção

| Item | Valor |
|---|---|
| Instalação | `pip install -r requirements.txt` (a plataforma faz isso sozinha) |
| Inicialização | `gunicorn app:app` (lê `gunicorn.conf.py`: `0.0.0.0:$PORT`, 1 worker + 8 threads, logs em stdout) |
| Esquema do banco | `python app.py init-db` (pre-deploy; só **adiciona** tabelas/colunas, nunca apaga) |
| Health check | `GET /health` (liveness, não usa o banco) · `GET /health/db` (readiness: banco + esquema) |
| Desenvolvimento | `./run.sh` (não usar em produção; `python app.py` é recusado fora de `PINGHUB_ENV=development`) |

`railway.json` já traz `startCommand`, `preDeployCommand` e `healthcheckPath`. Em outra plataforma, use os mesmos comandos.

**Por que 1 worker?** O limite de tentativas de login fica na memória do processo; com N workers o limite real seria 5×N. As 8 threads atendem o volume de um clube. Para escalar, defina `WEB_CONCURRENCY`, ciente dessa troca.

## 2. Variáveis de ambiente

Cadastre no painel da plataforma. **Não use arquivo `.env` em produção** (e nunca o envie ao Git).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | sim (`DB_PORT` padrão 3306) | Banco remoto. Sem valores padrão em produção; senha vazia é recusada |
| `SECRET_KEY` | sim | ≥ 32 caracteres aleatórios; assina os tokens de admin. Trocar invalida os logins ativos |
| `ADMIN_PASSWORD` | sim | ≥ 12 caracteres; diferente da `SECRET_KEY` |
| `PORT` | injetada pela plataforma | Padrão 8000 se ausente |
| `TRUSTED_PROXY_COUNT` | recomendada | `1` no Railway. Sem isso, atrás do proxy, **todos os visitantes compartilham o mesmo contador de login** (qualquer um bloquearia o admin). Com `0` o `X-Forwarded-For` é ignorado (não dá para forjar) |
| `PINGHUB_ENV` | não | Deixe **ausente** em produção. `development` só no seu computador |
| `DB_SSL=true` / `DB_SSL_CA=/caminho/ca.pem` | não | TLS com o banco, se o provedor exigir |
| `DB_AUTO_INIT` | não | `1` cria o esquema na 1ª requisição (fallback caso o pre-deploy não alcance o banco) |
| `ADMIN_TOKEN_HOURS`, `ADMIN_LOGIN_WINDOW`, `ADMIN_LOGIN_MAX` | não | 12 h · 900 s · 5 tentativas |
| `DB_CONNECT_TIMEOUT`, `DB_READ_TIMEOUT`, `LOG_LEVEL`, `GUNICORN_THREADS`, `GUNICORN_TIMEOUT` | não | 10 s · 30 s · INFO · 8 · 60 s |

Se algo obrigatório faltar ou for fraco/de exemplo, o processo **não sobe** e a mensagem lista os **nomes** das variáveis problemáticas (nunca os valores).

Gerar segredos (rode no seu computador e cole no painel; não os guarde em arquivos do repositório):

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"   # SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(24))"   # ADMIN_PASSWORD
```

## 3. Banco remoto

**Requisitos:** MySQL 8+ ou MariaDB 10.4+, `utf8mb4`, InnoDB (chaves estrangeiras e `SELECT … FOR UPDATE`), `GET_LOCK`. O código foi escrito para o MariaDB 10.4 local; **a compatibilidade com o MySQL 8 do Railway não foi testada contra um servidor real** (veja a seção 8). No MySQL 8 o PyMySQL precisa do pacote `cryptography` (já incluído via `PyMySQL[rsa]`).

### 3.1 Railway
1. No projeto, **+ New → Database → MySQL**. O Railway cria as variáveis `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
2. No serviço do PingHub (não no do MySQL), aponte as variáveis do app para o banco por referência:
   ```
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   ```
   (`MySQL` é o nome do serviço do banco no seu projeto; ajuste se for outro.)

### 3.2 Usuário da aplicação com permissões mínimas (recomendado)
O usuário que o Railway cria é o `root`. O app funciona com ele (e registra um aviso), mas o correto é um usuário próprio, restrito ao banco do PingHub. Conecte como administrador (ex.: `railway connect` ou o cliente `mysql` com a URL pública do serviço MySQL **[não verificado]**) e execute, trocando o nome do banco e a senha:

```sql
CREATE USER 'pinghub_app'@'%' IDENTIFIED BY '<SENHA_FORTE_GERADA>';
-- DML do dia a dia + DDL só para o init-db criar/adicionar tabelas e colunas. Sem DROP, sem GRANT, sem acesso global.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON `railway`.* TO 'pinghub_app'@'%';
```

Variante ainda mais restrita: rode `init-db` manualmente como administrador e dê ao usuário do app apenas `SELECT, INSERT, UPDATE, DELETE`. Depois, no serviço do PingHub, use `DB_USER=pinghub_app` e `DB_PASSWORD=<a senha acima>` no lugar das referências.

### 3.3 Esquema
`python app.py init-db` roda como pre-deploy a cada deploy. É idempotente e **somente aditivo** (`CREATE TABLE IF NOT EXISTS` + `ADD COLUMN` quando falta); um lock (`GET_LOCK`) impede que duas instâncias disputem o DDL. Mudanças futuras que removam ou renomeiem colunas **não** devem entrar nesse caminho automático: faça-as manualmente, em duas etapas (ver seção 6).
Se o pre-deploy não alcançar o banco **[não verificado: depende de a rede privada estar disponível nessa fase]**, defina `DB_AUTO_INIT=1` ou rode `init-db` uma vez a partir do seu computador com as variáveis do banco exportadas.

## 4. Publicar no Railway (passo a passo)
1. Suba este código ao GitHub **depois** da limpeza do versionamento (bloco de comandos `git rm -r --cached` no fim da seção 7).
2. Railway → **New Project → Deploy from GitHub repo** → escolha `PingHub`.
3. Adicione o MySQL (3.1) e cadastre as variáveis (seção 2), incluindo `TRUSTED_PROXY_COUNT=1`.
4. Em **Settings → Networking**, gere um domínio público.
5. Aguarde o deploy. O `railway.json` define o health check em `/health`.
6. Verifique:
   ```bash
   curl -i https://SEU-DOMINIO/health        # 200 {"status":"ok"}
   curl -i https://SEU-DOMINIO/health/db     # 200 se banco+esquema OK; 503 {"status":"unavailable"} caso contrário (causa no log)
   curl -s https://SEU-DOMINIO/api/stats
   ```
7. Teste o IP real do limite de login: cometa 5 erros de senha no Admin num aparelho/rede e confirme que outro aparelho/rede ainda consegue tentar (sem 429). Se todos forem bloqueados juntos, o `TRUSTED_PROXY_COUNT` não está correto para o caminho de proxies da plataforma.
8. Entre em **Admin** com `ADMIN_PASSWORD` e faça uma partida de teste.

## 5. Custos e limites
Não presuma gratuidade: o Railway cobra por uso de recursos (CPU/memória/rede, incluindo o serviço de banco), com créditos/planos que mudam. Confira a página de preços e os limites do seu plano antes de publicar. A configuração é padrão (WSGI + MySQL): serve também em Render, Fly.io ou uma VPS com o mesmo comando do Gunicorn; o `railway.json` é específico do Railway e inofensivo nas demais.

## 6. Atualização, rollback e backup
- **Atualizar:** `git push` na branch conectada → build → pre-deploy (`init-db`) → health check → troca de versão.
- **Rollback de código:** use **Deployments → Redeploy** de uma versão anterior no painel **[não verificado no seu plano]** ou reverta o commit. Como o esquema só cresce (colunas novas ficam no banco e são ignoradas pelo código antigo), voltar o código é seguro.
- **Mudanças destrutivas de esquema (futuro):** em duas versões — (1) código que para de usar a coluna; (2) só depois, remoção manual, após backup.
- **Backup:** não dependa só da plataforma. Rotina mínima (a partir do seu computador, banco remoto acessível):
  ```bash
  mysqldump -h HOST -P PORTA -u USUARIO -p --single-transaction --no-tablespaces --skip-lock-tables NOME_DO_BANCO > backup-$(date +%F).sql
  ```
  O arquivo contém dados pessoais (nomes, nascimentos, fotos): guarde fora do Git (`*.sql` já é ignorado). Teste a restauração em um banco descartável pelo menos uma vez.

## 7. Migrar os dados locais (XAMPP) com segurança

> Só execute se houver dados locais que você queira manter. Nada aqui é automático e nada foi executado em dados reais.

1. **Backup do local** (o `mysqldump` do XAMPP fica em `/opt/lampp/bin/`):
   ```bash
   /opt/lampp/bin/mysqldump -u root --single-transaction --skip-lock-tables pinghub > pinghub-local-completo.sql
   ```
2. **Crie o esquema no banco remoto vazio** (deploy normal ou `python app.py init-db` com as variáveis do banco). Isso garante tabelas no formato nativo do MySQL, em vez de importar o DDL do MariaDB.
3. **Confirme que o remoto está sem dados** que você queira preservar:
   ```sql
   SELECT (SELECT COUNT(*) FROM athletes) a, (SELECT COUNT(*) FROM matches) m, (SELECT COUNT(*) FROM tournaments) t;
   ```
4. **Exporte só os dados** (sem `DROP`/`CREATE`; `INSERT IGNORE` nunca sobrescreve linhas já existentes):
   ```bash
   /opt/lampp/bin/mysqldump -u root --no-create-info --complete-insert --insert-ignore \
       --single-transaction --skip-lock-tables --skip-triggers pinghub > pinghub-local-dados.sql
   ```
5. **Importe no remoto** (conectando direto ao banco, sem passar por terceiros):
   ```bash
   mysql -h HOST_PUBLICO -P PORTA -u USUARIO -p NOME_DO_BANCO < pinghub-local-dados.sql
   ```
6. **Confira** as contagens (local × remoto) de `athletes`, `matches`, `tournaments`, `tournament_matches`, `elo_history`, e o ranking em `/api/ranking`.
7. **Nunca** use um dump completo (com `DROP TABLE IF EXISTS`) contra um banco remoto que já tenha dados.

Antes do primeiro `git push` do código novo (limpeza do versionamento — não apaga arquivos do seu disco):
```bash
git rm -r --cached .venv __pycache__      # deixa de versionar; os arquivos continuam na sua pasta
git status                                 # confira: .env NÃO deve aparecer
git add -A && git commit -m "Prepara produção: gunicorn, config validada, health, .gitignore"
```
O histórico antigo ainda contém o `.venv/` (~1.285 arquivos). Isso só pesa o repositório; reescrever o histórico é opcional e **destrutivo**, então não foi feito.

## 8. Testes
```bash
python test_app.py          # lógica de torneios/partidas/ELO com banco simulado (SQLite)
python test_production.py   # configuração, segurança, health, falhas de banco (sem MySQL)
```
**Teste de integração contra MySQL/MariaDB real (faça antes de publicar):**
```bash
docker compose up -d                      # MySQL 8 local, somente em 127.0.0.1
export PINGHUB_ENV=development DB_HOST=127.0.0.1 DB_USER=root DB_PASSWORD=pinghub DB_NAME=pinghub \
       ADMIN_PASSWORD=uma-senha-de-teste SECRET_KEY=um-segredo-de-teste-qualquer
python app.py init-db --create-database   # cria banco e tabelas
python app.py                              # outro terminal: curl nas rotas /api/* e partidas/torneios pelo navegador
```
Repita contra um MariaDB 10.4 (seu XAMPP) para comparar os dois motores.

## 9. Riscos conhecidos e decisões suas
- **Escrita pública:** `POST /api/matches` e as rotas de `/api/mesa/*` não exigem admin (comportamento original, preservado). Qualquer visitante pode registrar partidas (alterando ELO) ou mexer na fila. Exigir login é uma mudança funcional: decida.
- **Token de admin** é stateless (12 h) e fica no `localStorage`; "sair" só o apaga no navegador. Não há revogação, a não ser trocar `SECRET_KEY`. O frontend escapa texto com `esc()` (verificado por amostragem, não por auditoria completa).
- **Limite de login** é por IP e por processo (memória). Sem CSRF porque não há cookies de sessão (o token vai em cabeçalho). Sem CORS (mesma origem).
- **CSP** não foi adicionada (o `index.html` usa scripts/estilos inline e CDNs; exigiria testes em navegador). O frontend carrega Bootstrap/ícones/fontes de CDN (jsDelivr, Google Fonts): fora do ar, a página perde estilo.
- `/api/athletes/<id>` e os CSV carregam todas as partidas em memória; ok para um clube, a revisar se o histórico crescer muito.
