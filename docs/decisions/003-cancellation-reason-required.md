# ADR 003 — cancellationReason obrigatório no cancelamento

## Status

Accepted (revisa DP-007:B / BR-037)

## Context

DP-007:B definiu `cancellationReason` sempre opcional, inclusive para `CANCELLED`.
Na implementação do módulo Lesson, o product owner exigiu motivo no cancelamento.

## Decision

- `POST /lessons/:id/cancel` exige `cancellationReason`
- Coluna no banco permanece nullable (outros status / dados legados)
- Status muda apenas via comandos (`complete`, `no-show`, `cancel`), não via POST/PATCH livres

## Consequences

- BR-037 atualizado
- Cancelamento sem motivo → 400
- Alinha cancelamento a motivos documentados (HOLIDAY, VACATION, etc.)
