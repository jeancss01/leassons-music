# Deploy free (MVP) — Neon + Render + Cloudflare Pages

Stack gratuita para validar o Violão Diário na internet. Esperado: **US$ 0**, com cold start no Render free.

```text
Browser → Cloudflare Pages (Angular)
              ↓ HTTPS
         Render (NestJS)
              ↓ SQL
         Neon (PostgreSQL)
```

Arquivos de apoio neste repo:

- `render.yaml` — Blueprint da API no Render
- `frontend/scripts/inject-api-base-url.mjs` — injeta a URL da API no build do Pages
- `frontend/public/_redirects` — SPA fallback (rotas Angular)
- `frontend/src/environments/environment.production.ts` — `apiBaseUrl` de produção

## Ordem recomendada

1. Neon (banco)
2. Render (API) — precisa da `DATABASE_URL`
3. Cloudflare Pages (frontend) — precisa da URL pública da API

## 1. Neon (PostgreSQL)

1. Crie conta em [neon.tech](https://neon.tech).
2. Crie um projeto (região próxima, ex. São Paulo se disponível).
3. Copie a connection string (**pooled** ou direta; Prisma aceita as duas em MVP).
4. Guarde como `DATABASE_URL` (formato `postgresql://...`).

Opcional: rode as migrations a partir da sua máquina antes do primeiro deploy:

```bash
cd backend
DATABASE_URL='postgresql://...' yarn prisma:migrate:deploy
```

Se pular isso, o Render aplica as migrations no `startCommand`.

## 2. Render (API NestJS)

Pré-requisito: repositório no GitHub/GitLab conectado ao Render.

### Opção A — Blueprint (`render.yaml`)

1. No Render: **New → Blueprint**.
2. Selecione o repo (raiz do monorepo, onde está `render.yaml`).
3. Confirme o serviço `violao-diario-api`.
4. Preencha os secrets (`sync: false`):

| Variável | Exemplo |
|---|---|
| `DATABASE_URL` | connection string do Neon |
| `AUTH_USERNAME` | seu usuário |
| `AUTH_PASSWORD` | senha forte |
| `JWT_SECRET` | string longa e aleatória |

5. Deploy. Anote a URL, ex.: `https://violao-diario-api.onrender.com`.

### Opção B — Web Service manual

- **Root Directory:** `backend`
- **Runtime:** Node
- **Build Command:** `yarn install --frozen-lockfile && yarn prisma generate && yarn build`
- **Start Command:** `yarn prisma:migrate:deploy && yarn start:prod`
- **Health Check Path:** `/health`
- **Node:** 22
- Mesmas env vars da tabela acima + `NODE_ENV=production` + `JWT_EXPIRES_IN=7d`

### Conferir a API

- Health: `https://SEU-SERVICO.onrender.com/health`
- Swagger: `https://SEU-SERVICO.onrender.com/api/docs`

**Cold start:** no plano free, após ~15 min sem tráfego a API “dorme”; a primeira requisição pode levar 30–60s.

## 3. Cloudflare Pages (Angular)

1. Conta em [Cloudflare Pages](https://pages.cloudflare.com).
2. **Create project** → conecte o mesmo repo.
3. Configuração de build:

| Campo | Valor |
|---|---|
| Root directory | `frontend` |
| Build command | `yarn install --frozen-lockfile && yarn build:pages` |
| Build output directory | `dist/frontend/browser` |
| Node version | `22` (Compatibility / env `NODE_VERSION=22`) |

4. Variável de ambiente de **build**:

| Variável | Valor |
|---|---|
| `API_BASE_URL` | `https://SEU-SERVICO.onrender.com` (sem barra no final) |

O script `build:pages` grava essa URL em `environment.production.ts` antes do `ng build`.

5. Deploy. Abra a URL `*.pages.dev`, faça login com `AUTH_USERNAME` / `AUTH_PASSWORD`.

### Rotas do Angular

`public/_redirects` envia `/* → /index.html` (status 200) para deep links (`/students/…`) funcionarem.

## Checklist pós-deploy

- [ ] `GET /health` na API responde ok (DB conectado)
- [ ] Login no frontend funciona
- [ ] Criar um aluno e ver no dashboard
- [ ] Senha e `JWT_SECRET` **não** são os do `.env.example`
- [ ] (Opcional) desative ou proteja Swagger se não quiser público

## Atualizar depois do primeiro deploy

1. Push no branch conectado → Render e Pages rebuildam.
2. Se a URL da API mudar, atualize `API_BASE_URL` no Pages e faça Redeploy.
3. Migrations novas: entram no próximo start do Render via `prisma:migrate:deploy`.

## Limitações do free tier

- Render free: sleep + cold start
- Neon free: limites de storage/compute; projeto pode pausar sem uso
- Não use como produção “séria” sem backup; para uso diário estável, prefira um VPS barato (ver discussão de arquitetura)

## Local vs produção (API URL)

| Ambiente | `apiBaseUrl` |
|---|---|
| `ng serve` (dev) | `/api` (proxy → Nest em `:3000`) |
| Cloudflare Pages | URL absoluta do Render (`API_BASE_URL`) |

Rotas Nest ficam na raiz (`/auth/login`, `/students`, …). Em produção **não** use prefixo `/api` no `apiBaseUrl`.
