# ADR 001 — Single-user authentication (v1)

## Status

Accepted

## Context

App pessoal com poucos usuários. Precisa de proteção mínima sem complexidade de multi-usuário.

## Decision

- Credenciais únicas em variáveis de ambiente (`AUTH_USERNAME`, `AUTH_PASSWORD`)
- Login via `POST /auth/login`
- JWT assinado com `JWT_SECRET`, expiração configurável (`JWT_EXPIRES_IN`)
- Sem tabela de usuários na v1
- Sem refresh tokens / OAuth / social login

## Consequences

- Simples de operar e de testar
- Troca de senha = editar `.env` e reiniciar
- Evolução futura para multi-usuário exigiria nova ADR e migração
