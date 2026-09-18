# Regras de negócio (MVP)

Não inventar regras além das documentadas aqui.
Se uma implementação exigir decisão não listada, registrar em **Decisões pendentes** — não escolher arbitrariamente.

Legenda de enforcement (resumo; detalhe em `docs/database.md`):

| Marcador | Significado |
|----------|-------------|
| **DB** | Pode ser garantido (total ou parcialmente) por constraint no PostgreSQL |
| **APP** | Deve ser garantido pela aplicação |
| **DERIVED** | Calculado; não persistido como tabela/entidade |

Decisões de modelagem fechadas: `docs/decisions/002-domain-pending-closed.md`.

---

## Aluno

**BR-001** — Todo aluno possui nome e data de início. **DB** (NOT NULL) + **APP** (validação de entrada)

**BR-002** — Aluno pode estar `ACTIVE` ou `INACTIVE`. **DB** (enum/CHECK)

**BR-003** — Inativar aluno não remove seu histórico (aulas, horários, cobranças, vínculos pedagógicos). **APP** (sem hard-delete em cascata de negócio; inativação apenas muda `status`)

**BR-004** — Aluno `INACTIVE` não aparece na lista padrão de alunos. **APP** (filtro de listagem; default = somente `ACTIVE`)

**BR-005** — Cada aluno possui valor padrão de mensalidade (`monthlyFee`). **DB** (NOT NULL) + **APP**

**BR-006** — No MVP não há hard delete de entidades de domínio. Aluno apenas inativa (`INACTIVE`). Cobranças indesejadas usam `status = CANCELLED`. **APP**

---

## Agenda (Schedule)

**BR-010** — Um aluno pode possuir horário(s) recorrente(s) modelados como `Schedule`. **APP** / relacionamento

**BR-011** — O horário recorrente possui dia da semana (`weekday` ∈ `MONDAY`…`SUNDAY`) e horário (`startTime`), além de duração (`durationMinutes`). **DB** + **APP**

**BR-012** — Alterações excepcionais de horário não alteram o `Schedule`. A alteração é registrada na ocorrência específica (`Lesson`). **APP**

**BR-013** — É permitido manter histórico de horários usando `validFrom` / `validUntil`. **APP** (+ campos **DB**)

**BR-014** — Um aluno pode ter **múltiplos** `Schedule` com `active = true` ao mesmo tempo (ex.: duas aulas/semana). **APP** / **DB** (sem UNIQUE de um ativo por aluno)

**BR-015** — `Schedule.active` é a fonte da verdade de “horário em uso”. `validFrom` / `validUntil` servem ao histórico e não substituem `active`. **APP**

---

## Aulas (Lesson)

**BR-020** — Aula regular (`type = REGULAR`) normalmente possui `Schedule` (`scheduleId` preenchido). **APP** (não é NOT NULL no banco)

**BR-020a** — `REGULAR` sem `scheduleId` é permitido; a interface deve exibir aviso. **APP** (UI)

**BR-021** — Aula de reposição (`type = MAKEUP`) não altera o `Schedule`. **APP**

**BR-022** — Aula avulsa (`type = ONE_OFF`) pode não possuir `Schedule`. **APP** / **DB** (`scheduleId` nullable)

**BR-023** — Feriado não gera reposição automática. **APP**

**BR-024** — Férias não geram reposição automática. **APP**

**BR-025** — Cancelamento do professor não gera reposição automática. **APP**

**BR-026** — Cancelamento do aluno não gera reposição automática. **APP**

**BR-027** — Reposição é criada manualmente quando combinada com o aluno (`type = MAKEUP`). **APP**

**BR-028** — Aluno que não comparece sem cancelamento prévio pode ser marcado como `NO_SHOW`. **APP**

**BR-029** — Cancelamentos (`status = CANCELLED`) não são contabilizados como faltas. **DERIVED** / **APP** (na frequência)

**BR-033** — Tipos de aula: `REGULAR`, `MAKEUP`, `ONE_OFF`. **DB**

**BR-034** — Status de aula: `SCHEDULED`, `COMPLETED`, `NO_SHOW`, `CANCELLED`. **DB**

**BR-035** — Motivos de cancelamento: `HOLIDAY`, `VACATION`, `TEACHER_CANCELLED`, `STUDENT_CANCELLED`, `OTHER`. **DB** (quando informado)

**BR-037** — `cancellationReason` é **obrigatório** ao cancelar uma Lesson (`POST /lessons/:id/cancel` com `status = CANCELLED`). Para outros status permanece nulo. **APP** (coluna continua nullable no DB; enforcement na API de cancelamento). Revisado em ADR 003 (substitui DP-007:B).

---

## Frequência

Não criar tabela `Attendance` no MVP. **APP** / modelagem

**BR-030** — Frequência:

```text
frequency = completed / (completed + noShow)
```

**DERIVED**

**BR-031** — `CANCELLED` não entra no cálculo. **DERIVED**

**BR-032** — `MAKEUP` realizada (`COMPLETED`) conta como aula realizada (entra em `completed`). **DERIVED**

**BR-036** — Mapeamento: `COMPLETED` = presença; `NO_SHOW` = falta; `CANCELLED` = ignorada. **DERIVED**

**BR-038** — `SCHEDULED` não entra na fórmula. **DERIVED**

**BR-039** — Período padrão do cálculo de frequência: **mês corrente** (fuso `America/Sao_Paulo`). **APP**

---

## Diário pedagógico

**BR-050** — Conteúdo pedagógico da aula fica em `Lesson.content`, `Lesson.exercises`, `Lesson.observations`. **DB** (colunas TEXT nullable)

**BR-050a** — Uma Lesson com status `SCHEDULED` pode conter planejamento pedagógico antes de sua realização. O mesmo registro pode posteriormente representar o diário da aula realizada (`COMPLETED` e demais status finais). Não existe entidade separada de planejamento ou diário. **APP** (UX/contrato; mesmos campos)

**BR-051** — Esses campos armazenam Markdown puro. **APP** (sem HTML sanitizado no armazenamento; renderização/sanitização é concern de UI)

**BR-052** — Tags pedagógicas: `Tag` com `name` único; associação N:N via `LessonTag` com PK `(lessonId, tagId)`. **DB** + **APP**

---

## Financeiro (MonthlyCharge)

**BR-040** — Mensalidade independe do número de aulas. **APP**

**BR-041** — Cada aluno possui valor padrão de mensalidade (`Student.monthlyFee`). **DB** + **APP**

**BR-042** — Cada cobrança armazena seu próprio valor (`MonthlyCharge.amount`). **DB**

**BR-043** — Alteração futura da mensalidade do aluno não altera cobranças anteriores. **APP**

**BR-044** — Um aluno possui no máximo uma cobrança por mês de referência. **DB** `UNIQUE(studentId, referenceMonth)`

**BR-045** — Pagamento não depende da quantidade ou status das aulas. **APP**

**BR-046** — Status de cobrança: `PENDING`, `PAID`, `CANCELLED`. **DB**

**BR-047** — Não implementar cobrança parcial/parcelamento no MVP. **APP**

**BR-048** — Aluno que começa no meio do mês não terá pró-rata automático no MVP. **APP**

**BR-049** — Geração mensal de cobranças será manual inicialmente. **APP**

**BR-053** — Na geração, `amount` é copiado da mensalidade vigente (`Student.monthlyFee`) naquele momento. **APP**

**BR-054** — `referenceMonth` é armazenado como texto `YYYY-MM`. **DB**

---

## Geração de Lessons a partir de Schedule

**BR-060** — Cada `Schedule` ativo representa **uma ocorrência semanal**. Não há limite de aulas por mês. **APP**

**BR-061** — A geração manual (`POST /lessons/generate`) cria Lessons `REGULAR` / `SCHEDULED` a partir dos Schedules aplicáveis, até no máximo **3 meses de calendário** a partir de “hoje” (`America/Sao_Paulo`). Ex.: 2026-09-18 → limite 2026-12-18. O backend é a autoridade do horizonte; o cliente não pode estender esse limite. **APP**

**BR-062** — Uma ocorrência só é gerada se: Student `ACTIVE`; Schedule `active = true`; `date >= validFrom`; e, se `validUntil` existir, `date <= validUntil`. **APP**

**BR-063** — Lessons geradas carregam `studentId`, `scheduleId`, `date`, `startTime` e `durationMinutes` do Schedule. Não preenchem `content` / `exercises` / `observations`. **APP**

**BR-064** — A geração é idempotente: não duplica, não sobrescreve planejamento e não altera Lessons existentes (qualquer status) para o mesmo `scheduleId` + `date`. **DB** (UNIQUE parcial efetiva via UNIQUE `(schedule_id, date)` com NULLs distintos) + **APP** (`createMany` + `skipDuplicates`)

**BR-065** — MAKEUP e ONE_OFF não são criadas pelo gerador. Cancelamento continua sem reposição automática (BR-023–027). **APP**

---

## Operação / tempo

**BR-070** — Fuso horário operacional do domínio (agenda, “hoje”, mês corrente da frequência/dashboard, horizonte de geração): `America/Sao_Paulo`. **APP**

---

## Decisões pendentes

Nenhuma DP bloqueante para a primeira migration.

Único item **adiado de propósito** (não bloqueia schema):

### DP-013 (adiado) — Cancelamento explícito de MonthlyCharge

O status `CANCELLED` existe no modelo (BR-046 / BR-006), mas não há endpoint/comando de cancelamento nesta etapa.
Não inventar `POST /monthly-charges/:id/cancel` até decisão explícita.

---

## Fora do escopo do MVP (explícito)

- Tabela `Attendance`
- Pró-rata automático
- Cobrança parcial / parcelamento
- Geração automática de reposição a partir de cancelamentos
- Cron/job automático de geração de Lessons (geração é manual)
- Hard delete de entidades de domínio
