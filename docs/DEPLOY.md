# DEPLOY.md — Subindo o Project 2.0 para produção

Guia de deploy com **frontend no Cloudflare Pages**, **backend no Render** e
**banco no Supabase**. Os três no plano gratuito.

```
Cloudflare Pages          Render (Web Service)         Supabase
┌──────────────┐  HTTPS   ┌────────────────────┐  SSL  ┌─────────────┐
│ Angular SPA  │ ───────▶ │ NestJS API         │ ────▶ │ PostgreSQL  │
│ *.pages.dev  │  + CORS  │ *.onrender.com     │ pool  │  + pooler   │
└──────────────┘          └────────────────────┘       └─────────────┘
```

> **Ordem obrigatória:** há dependência circular de URLs (o front precisa da URL
> do back; o back precisa da origem do front no CORS). A ordem resolve isso:
> **1. Supabase → 2. Render → 3. Cloudflare**. O CORS do back é via variável de
> ambiente (sem rebuild); a URL da API no front é compilada no build (front por último).

---

## Como o backend roda em produção (entenda antes)

O pacote `shared` é consumido como **TypeScript-fonte** (`main: src/index.ts`, sem
build próprio) e o backend o importa via `@project20/shared`. Por isso **não** se roda
`node dist/main.js` — o backend roda direto do TS com **`ts-node`**, igual ao dev:

```
node --require ts-node/register src/main.ts      →  npm run start:prod --workspace=backend
```

Consequência prática: `ts-node` e `typescript` são **devDependencies**. O Render
pula devDependencies quando `NODE_ENV=production`, então o **Build Command instala
com `--include=dev`** (ver abaixo). Não use `tsx`/esbuild: ele não emite
`emitDecoratorMetadata` e quebra a injeção de dependência do NestJS.

---

## 1. Banco — Supabase

1. Crie um projeto em <https://supabase.com> (escolha uma região próxima; guarde a
   senha do banco definida na criação).
2. **Project Settings → Database → Connection string → aba "Session pooler".**
   Use o **Session pooler** (não o Transaction pooler): é compatível com o pool de
   conexões do Knex e com um servidor long-running. A string tem este formato:

   ```
   postgresql://postgres.<ref>:<SENHA>@aws-0-<regiao>.pooler.supabase.com:5432/postgres
   ```

3. Extraia os campos para as variáveis de ambiente (usadas no passo 2 do Render):

   | Variável   | Valor (da connection string)                    |
   |------------|-------------------------------------------------|
   | `DB_HOST`  | `aws-0-<regiao>.pooler.supabase.com`            |
   | `DB_PORT`  | `5432`                                          |
   | `DB_NOME`  | `postgres`                                      |
   | `DB_USUARIO` | `postgres.<ref>`                              |
   | `DB_SENHA` | a senha do banco                                |
   | `DB_SSL`   | `true`                                          |

> As migrations (incl. seed do gestor inicial e tags padrão) são aplicadas pelo
> Render no passo 2 — não precisa rodar nada manualmente no Supabase.

---

## 2. Backend — Render

1. <https://render.com> → **New → Web Service** → conecte o repositório Git.
2. Configure:

   | Campo                  | Valor                                            |
   |------------------------|--------------------------------------------------|
   | **Root Directory**     | *(vazio — raiz do repo; o symlink do workspace `shared` depende disso)* |
   | **Runtime**            | Node                                             |
   | **Build Command**      | `npm install --include=dev`                      |
   | **Pre-Deploy Command** | `npm run db:migrate --workspace=backend`         |
   | **Start Command**      | `npm run start:prod --workspace=backend`         |

3. **Environment Variables** (Settings → Environment):

   | Variável                  | Valor                                              |
   |---------------------------|----------------------------------------------------|
   | `DB_HOST` … `DB_SSL`      | do passo 1 (`DB_SSL=true`)                         |
   | `JWT_SECRETO`             | **gere um valor forte e único** (ex.: `openssl rand -hex 32`) |
   | `JWT_EXPIRACAO`           | `8h`                                               |
   | `INTERVALO_MINIMO_MINUTOS`| `15`                                               |
   | `APP_PORTA`               | `10000` *(fallback; o Render injeta `PORT` automaticamente e o app prioriza `PORT`)* |
   | `APP_AMBIENTE`            | `production`                                        |
   | `APP_CORS_ORIGEM`         | a URL do Cloudflare Pages — **preencha no passo 3** |
   | `ANTHROPIC_API_KEY`       | *(opcional — deixe vazio por enquanto; sem ela o auxílio de descrições por IA fica indisponível, o resto funciona)* |

   > **Não** defina `NODE_ENV=production` — isso faria o `npm install` pular `ts-node`/`typescript`.
   > Use `APP_AMBIENTE=production` para o ambiente lógico da aplicação.

4. Faça o deploy. Anote a URL pública: `https://<seu-servico>.onrender.com`.
   Valide com `GET https://<seu-servico>.onrender.com/api/v1` e o Swagger em `/api/docs`.

> **Free tier:** o serviço hiberna após ~15 min sem tráfego; o primeiro request
> depois disso demora ~50s ("cold start"). Normal para começar.

---

## 3. Frontend — Cloudflare Pages

1. **Antes de buildar**, edite `frontend/src/environments/environment.production.ts`
   e troque o placeholder pela URL real do Render:

   ```ts
   apiUrl: 'https://<seu-servico>.onrender.com/api/v1',
   ```
   Faça commit/push dessa mudança.

2. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git**.
3. Configure o build:

   | Campo                       | Valor                                         |
   |-----------------------------|-----------------------------------------------|
   | **Build command**           | `npm install && npm run build --workspace=frontend` |
   | **Build output directory**  | `frontend/dist/frontend/browser`              |
   | **Root directory**          | *(vazio — raiz do repo)*                       |

4. Deploy. Anote a URL: `https://<seu-projeto>.pages.dev`.
   O arquivo `_redirects` (já versionado em `frontend/src/`, copiado para a raiz do
   build) garante o fallback de SPA do Angular (`/* /index.html 200`).

5. **Feche o CORS:** volte ao Render, defina
   `APP_CORS_ORIGEM = https://<seu-projeto>.pages.dev` e redeploy do backend
   (só reinício, sem rebuild de código).

---

## 4. Pós-deploy

- Acesse o front, faça login com o gestor inicial:

  | Login            | Senha         |
  |------------------|---------------|
  | `gestor.inicial` | `project2026` |

- **Troque a senha** imediatamente após o primeiro login.
- (Opcional) Quando quiser ativar a IA: defina `ANTHROPIC_API_KEY` no Render e redeploy.

---

## Checklist rápido

- [ ] Supabase criado; Session pooler copiado; `DB_SSL=true`
- [ ] Render: Build `npm install --include=dev`, Start `start:prod`, Pre-Deploy `db:migrate`
- [ ] Render: envs preenchidas; `JWT_SECRETO` forte; **sem** `NODE_ENV=production`
- [ ] `environment.production.ts` apontando para a URL do Render (commitado)
- [ ] Cloudflare Pages: output `frontend/dist/frontend/browser`
- [ ] `APP_CORS_ORIGEM` no Render = URL do Pages
- [ ] Login com gestor inicial + troca de senha
