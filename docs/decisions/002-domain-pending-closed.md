# ADR 002 — Fechamento das decisões pendentes de domínio (MVP)

## Status

Accepted

## Context

As DPs em `docs/business-rules.md` bloqueavam o congelamento do schema.
Escolhas feitas pelo product owner em 2026-09-10.

## Decision

| DP | Escolha | Efeito |
|----|---------|--------|
| DP-001 | A — enum `MONDAY`…`SUNDAY` | Tipo PostgreSQL `weekday` |
| DP-002 | B — `YYYY-MM` | `CHAR(7)` + CHECK de formato |
| DP-003 | A — só `name` único | `tags.name UNIQUE` |
| DP-004 | A — PK `(lessonId, tagId)` | Sem `id` / `createdAt` na associação |
| DP-005 | B — vários schedules ativos | Sem UNIQUE de um ativo por aluno |
| DP-006 | C — REGULAR sem schedule permitido + aviso UI | Sem CHECK no banco; regra BR-020a |
| DP-007 | B — `cancellationReason` sempre opcional | Sem CHECK status↔motivo |
| DP-008 | B — `active` é fonte da verdade; `valid*` histórico | BR-015 |
| DP-009 | A — adiar até geração de aulas | BR-062; único item ainda aberto |
| DP-010 | B — `SCHEDULED` fora; período padrão = mês corrente | BR-038, BR-039 |
| DP-011 | A — `America/Sao_Paulo` | BR-070 |
| DP-012 | A — sem hard delete no MVP | BR-006; FKs RESTRICT |

## Consequences

- Schema proposto em `docs/database.md` deixa de ser provisório nos pontos acima.
- DP-009 permanece adiado e **não** bloqueia a primeira migration.
- Próximo passo técnico: Prisma schema + migration inicial (quando solicitado).
