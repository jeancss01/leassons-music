# Architecture

## Overview

Monorepo simples com dois pacotes independentes (sem Nx/Turborepo):

- `frontend/` — Angular 21
- `backend/` — NestJS + Prisma
- `docker-compose.yml` — apenas PostgreSQL

## Backend layout

```text
backend/src/
  auth/       # login único (JWT)
  health/     # GET /health
  prisma/     # PrismaService global
backend/prisma/
  schema.prisma
  migrations/20260910170218_init_domain/
```

Módulos Nest de domínio (`students`, `schedules`, …) serão adicionados por feature.
O schema PostgreSQL do MVP já está migrado.

## Frontend layout

```text
frontend/src/app/
  core/       # auth, layout, HTTP
  shared/     # componentes auxiliares
  features/
    dashboard/ # painel operacional (somente leitura)
    students/  # aluno, schedule, lesson e financeiro no contexto do aluno
```

Rotas principais (JWT):

- `/` → redirect para `/dashboard`
- `/dashboard` — painel operacional (alunos ativos, aulas de hoje/próximas, mensalidades pendentes, totais); montado a partir de `GET /students`, `GET /lessons` e `GET /monthly-charges` (sem endpoint `/dashboard`)
- `/students`, `/students/new`, `/students/:id`, `/students/:id/edit`
- `/students/:id/schedule/new`, `/students/:id/schedule/:scheduleId/edit`
- `/students/:id/lesson/new`, `/students/:id/lesson/:lessonId`, `/students/:id/lesson/:lessonId/edit`
  - no detalhe do aluno, a seção **Diário pedagógico** organiza Lessons em Hoje / Próximas / Histórico (filtro temporal por `date`; planejamento visível no card)
  - ação **Gerar próximas aulas** chama `POST /lessons/generate` (horizonte de 3 meses de calendário; idempotente) e atualiza o diário
  - ação **Planejar próxima aula** aponta para a primeira Lesson com `date > hoje` (ordenado por data/horário) com `?plan=1`; se não houver Lesson futura, exibe estado + **Nova aula** (sem gerar a partir de Schedule)
  - no detalhe da aula, o **planejamento** (`SCHEDULED`) ou **diário** (aula realizada) usa os mesmos campos `content`/`exercises`/`observations` via `PATCH /lessons/:id`; a rota `/edit` permanece para os demais campos
  - `?plan=1` no detalhe da aula abre o editor inline do planejamento
- Financeiro (mensalidades) na seção do detalhe do aluno — sem rota global nesta etapa

### Limitações do Dashboard (dados existentes)

- **Recebido no mês:** calculado no frontend filtrando cobranças `PAID` cujo `paidAt` cai no mês civil local; a API não filtra por `paidAt`.
- Sem rota global de Lessons/Financeiro: cards de aulas/financeiro são informativos; navegação contextual vai para o detalhe do aluno/aula.

## Auth (v1)

- Um único usuário via variáveis de ambiente
- `POST /auth/login` → JWT
- Guard JWT no backend; interceptor + guard no frontend
- Detalhes em `docs/decisions/001-single-user-auth.md`

## OpenAPI

- Spec gerada por `@nestjs/swagger`
- UI: `GET /api/docs`
- Redoc no frontend fica para etapa futura

## Local development

Na raiz do monorepo:

```bash
yarn install:all   # primeira vez
yarn start         # Postgres + API (:3000) + frontend (:4200)
yarn stop          # derruba o Postgres
```

`yarn start` sobe o Postgres (`docker compose up -d`), espera o healthcheck e sobe API + frontend em paralelo via `concurrently`.

## Deploy MVP (free)

Neon (Postgres) + Render (API) + Cloudflare Pages (Angular). Passo a passo em `docs/deploy-free.md`.

## Non-goals

Sem microservices, Redis, message broker, CQRS, Kubernetes ou auth multi-usuário na v1.
