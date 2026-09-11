# Violão Diário

Aplicação web pessoal para gerenciamento de alunos de aulas de violão.

## Stack

- Frontend: Angular 21 (standalone, signals, Material 3)
- Backend: NestJS 11 + Prisma 6 + PostgreSQL
- Docker: apenas PostgreSQL no dia a dia
- OpenAPI: Swagger UI em `/api/docs`

## Pré-requisitos

- Node.js 22 LTS
- Yarn 1
- Docker (para o banco)

## Subir o ambiente

Primeira vez (instala deps de root, backend e frontend):

```bash
cp backend/.env.example backend/.env   # se ainda não existir
yarn install:all
```

No dia a dia (sobe Postgres + API + frontend):

```bash
yarn start
```

Para parar o banco:

```bash
yarn stop
```

- App: http://localhost:4200
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

Login padrão (dev): usuário/senha definidos em `backend/.env` (`AUTH_USERNAME` / `AUTH_PASSWORD`).

## Deploy MVP (grátis)

Neon + Render + Cloudflare Pages — ver `docs/deploy-free.md`.

## Scripts úteis

### Root

- `yarn start` — Postgres + backend + frontend
- `yarn stop` — derruba o Postgres
- `yarn install:all` — instala dependências de todos os pacotes

### Backend

- `yarn --cwd backend lint` / `test` / `test:e2e` / `build`
- `yarn --cwd backend prisma:migrate` — migrations (quando houver modelos)

### Frontend

- `yarn --cwd frontend lint` / `test` / `build` / `format`

## Documentação

- `docs/setup.md` — setup do zero (máquina sem nada configurado)
- `docs/deploy-free.md` — deploy MVP grátis (Neon + Render + Cloudflare Pages)
- `docs/architecture.md` — estrutura e decisões de infraestrutura
- `docs/domain.md` — modelo de domínio
- `docs/business-rules.md` — regras de negócio
- `docs/api.md` — OpenAPI / REST
- `docs/decisions/` — ADRs curtos
