# Modelo de domínio (MVP)

Fonte de verdade para entidades e relacionamentos do Violão Diário.
Congelado antes de migrations, modelos de código e endpoints de domínio.

Decisões de modelagem fechadas: ver `docs/decisions/002-domain-pending-closed.md`.

## Diagrama de relacionamentos

```text
Student 1 ─── * Schedule
Student 1 ─── * Lesson
Student 1 ─── * MonthlyCharge
Schedule 1 ─── * Lesson          (opcional em Lesson.scheduleId)
Lesson * ─── * Tag               (via LessonTag)
```

Não existe entidade `Attendance` no MVP. Frequência é derivada de `Lesson`.

Fuso horário operacional do domínio: `America/Sao_Paulo` (datas/horários de agenda e dashboard interpretados nesse fuso).

---

## Student

Aluno matriculado em aulas de violão.

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| id | sim | Identificador |
| name | sim | Nome |
| email | não | E-mail |
| phone | não | Telefone |
| startDate | sim | Data de início |
| monthlyFee | sim | Mensalidade vigente padrão do aluno |
| status | sim | `ACTIVE` \| `INACTIVE` |
| notes | não | Observações gerais do aluno |
| createdAt | sim | Auditoria |
| updatedAt | sim | Auditoria |

### Relacionamentos

- Possui zero ou mais `Schedule` (incluindo vários **ativos** ao mesmo tempo, ex.: dois dias na semana).
- Possui zero ou mais `Lesson`.
- Possui zero ou mais `MonthlyCharge`.

### Comportamento de listagem e exclusão

- Aluno `INACTIVE` não aparece na lista padrão.
- Inativar não remove histórico (schedules, lessons, charges, tags vinculadas a aulas).
- No MVP não há hard delete de entidades de domínio (aluno apenas inativa; cobrança usa `CANCELLED` quando aplicável).

---

## Schedule

Horário semanal recorrente do aluno.

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| id | sim | Identificador |
| studentId | sim | FK → Student |
| weekday | sim | Dia da semana: enum `MONDAY`…`SUNDAY` |
| startTime | sim | Horário de início recorrente |
| durationMinutes | sim | Duração em minutos |
| validFrom | sim | Início do período histórico deste registro |
| validUntil | não | Fim do período histórico; apoio a histórico |
| active | sim | **Fonte da verdade** de “está em uso agora” |
| createdAt | sim | Auditoria |
| updatedAt | sim | Auditoria |

### weekday

`MONDAY` | `TUESDAY` | `WEDNESDAY` | `THURSDAY` | `FRIDAY` | `SATURDAY` | `SUNDAY`

### Relacionamentos

- Pertence a um `Student`.
- Pode ser referenciado por zero ou mais `Lesson` (`Lesson.scheduleId`).

### Comportamento

- Alteração excepcional de horário **não** altera o `Schedule`; registra-se na ocorrência (`Lesson`).
- Um aluno pode ter **múltiplos** schedules com `active = true` (ex.: segunda e quarta).
- `active` decide se o horário está vigente para operação.
- `validFrom` / `validUntil` registram o intervalo histórico do registro; não substituem `active`.

---

## Lesson

Ocorrência concreta de uma aula.

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| id | sim | Identificador |
| studentId | sim | FK → Student |
| scheduleId | não | FK → Schedule (quando aplicável) |
| date | sim | Data da ocorrência (calendário em `America/Sao_Paulo`) |
| startTime | sim | Horário de início desta ocorrência |
| durationMinutes | sim | Duração em minutos |
| type | sim | `REGULAR` \| `MAKEUP` \| `ONE_OFF` |
| status | sim | `SCHEDULED` \| `COMPLETED` \| `NO_SHOW` \| `CANCELLED` |
| cancellationReason | não* | Motivo de cancelamento; *obrigatório ao cancelar via API |
| content | não | Diário pedagógico — Markdown |
| exercises | não | Exercícios — Markdown |
| observations | não | Observações — Markdown |
| createdAt | sim | Auditoria |
| updatedAt | sim | Auditoria |

### Enums

**type**

| Valor | Significado |
|-------|-------------|
| REGULAR | Aula regular (em geral ligada a um Schedule) |
| MAKEUP | Reposição |
| ONE_OFF | Aula avulsa |

**status**

| Valor | Significado |
|-------|-------------|
| SCHEDULED | Agendada |
| COMPLETED | Realizada |
| NO_SHOW | Falta (sem cancelamento prévio) |
| CANCELLED | Cancelada (não é falta) |

**cancellationReason**

| Valor | Significado |
|-------|-------------|
| HOLIDAY | Feriado |
| VACATION | Férias |
| TEACHER_CANCELLED | Cancelamento do professor |
| STUDENT_CANCELLED | Cancelamento do aluno |
| OTHER | Outro |

`cancellationReason` é obrigatório no comando de cancelamento; permanece nulo nos demais status.

### Relacionamentos

- Pertence a um `Student`.
- Pode referenciar zero ou um `Schedule`.
- Possui zero ou mais `Tag` via `LessonTag`.

### Comportamento de `REGULAR` e `scheduleId`

- Aula regular **normalmente** possui `scheduleId`.
- `REGULAR` **sem** `scheduleId` é **permitido**; a UI deve **avisar**.

### Diário pedagógico

`content`, `exercises` e `observations` armazenam Markdown puro na própria `Lesson`.

---

## Tag

Marcador pedagógico associado a aulas.

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| id | sim | Identificador |
| name | sim | Nome (único) |
| createdAt | sim | Auditoria |
| updatedAt | sim | Auditoria |

### Relacionamentos

- Associada a zero ou mais `Lesson` via `LessonTag`.

---

## LessonTag

Associação entre `Lesson` e `Tag` (N:N).

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| lessonId | sim | FK → Lesson |
| tagId | sim | FK → Tag |

Chave primária composta: `(lessonId, tagId)`.
Sem `id` próprio e sem metadados adicionais no MVP.

### Relacionamentos

- Pertence a uma `Lesson`.
- Pertence a uma `Tag`.

---

## MonthlyCharge

Cobrança mensal fixa de mensalidade.

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| id | sim | Identificador |
| studentId | sim | FK → Student |
| referenceMonth | sim | Mês de referência no formato `YYYY-MM` |
| amount | sim | Valor desta cobrança (cópia no momento da geração) |
| dueDate | não | Data de vencimento |
| status | sim | `PENDING` \| `PAID` \| `CANCELLED` |
| paidAt | não | Data/hora do pagamento |
| notes | não | Observações financeiras |
| createdAt | sim | Auditoria |
| updatedAt | sim | Auditoria |

### Relacionamentos

- Pertence a um `Student`.

### Invariante

- No máximo uma cobrança por par (`studentId`, `referenceMonth`).

---

## Conceitos derivados (sem tabela)

### Frequência

Calculada a partir das `Lesson` do aluno no **mês corrente** (padrão), podendo a UI oferecer outro período depois:

- `COMPLETED` → presença
- `NO_SHOW` → falta
- `CANCELLED` → ignorada
- `SCHEDULED` → fora da fórmula

Fórmula:

```text
frequency = completed / (completed + noShow)
```

`MAKEUP` com status `COMPLETED` conta como aula realizada (entra em `completed`).

### Schedule → Lesson

`Schedule` representa uma **recorrência semanal** (um weekday + horário).

Cada ocorrência válida no horizonte de planejamento gera uma Lesson:

- `type = REGULAR`
- `status = SCHEDULED`
- `scheduleId` preenchido
- `content` / `exercises` / `observations` vazios (planejamento posterior)

### Horizonte

Lessons futuras podem ser geradas até no máximo **3 meses de calendário** a partir da data atual (`America/Sao_Paulo`).  
Ex.: 2026-09-18 → limite 2026-12-18.

### Tipos

| Tipo | Origem |
|------|--------|
| `REGULAR` | Tipicamente originada de Schedule (geração ou criação manual) |
| `ONE_OFF` | Aula avulsa manual; não altera Schedule |
| `MAKEUP` | Reposição explícita; nunca criada pelo gerador |

### Idempotência

Executar a geração novamente não duplica nem altera Lessons existentes para o mesmo `scheduleId` + `date`.

### Histórico

Alterar Schedule **não** altera Lessons já existentes (BR-012).

### Regra removida

A antiga regra de “4 aulas por mês / quinta semana para exercícios” **não se aplica**.
