# Banco de dados (proposta — MVP)

Proposta de schema PostgreSQL alinhada a `docs/domain.md` e `docs/business-rules.md`.

Implementação Prisma:

- Schema: `backend/prisma/schema.prisma`
- Migration aplicada: `backend/prisma/migrations/20260910170218_init_domain/`

Decisões de modelagem fechadas: `docs/decisions/002-domain-pending-closed.md`.

---

## Separação: negócio × banco × aplicação

| Regra / invariante | Tipo | Enforcement |
|--------------------|------|-------------|
| Student.name, startDate, monthlyFee, status obrigatórios | BR-001, BR-002, BR-005 | **DB** NOT NULL + enum |
| Student.status ∈ {ACTIVE, INACTIVE} | BR-002 | **DB** enum |
| Sem hard delete / inativar aluno | BR-003, BR-006 | **APP** |
| Lista padrão só ACTIVE | BR-004 | **APP** |
| weekday enum MONDAY…SUNDAY | BR-011 | **DB** enum |
| Múltiplos schedules active por aluno | BR-014 | **DB** (sem UNIQUE) + **APP** |
| active = fonte da verdade; valid\* = histórico | BR-015 | **APP** |
| Alteração excepcional só na Lesson | BR-012 | **APP** |
| Lesson.scheduleId opcional | BR-020, BR-022, BR-020a | **DB** NULL; **APP**/UI aviso se REGULAR |
| cancellationReason obrigatório no cancel (API) | BR-037 (ADR 003) | **APP**; coluna DB permanece nullable |
| Tipos/status/motivos de Lesson | BR-033–035 | **DB** enums |
| Tag.name único | BR-052 | **DB** UNIQUE |
| LessonTag PK (lesson_id, tag_id) | BR-052 | **DB** |
| reference_month `YYYY-MM` | BR-054 | **DB** CHAR(7) + CHECK |
| UNIQUE cobrança por aluno/mês | BR-044 | **DB** |
| amount copiado na geração | BR-042, BR-043, BR-053 | **DB** coluna; **APP** cópia |
| Frequência mês corrente; SCHEDULED fora | BR-030–039 | **DERIVED** / **APP** |
| Regra das 4 aulas (+ DP-009 adiado) | BR-060–062 | **APP** |
| Timezone America/Sao_Paulo | BR-070 | **APP** (interpretação; colunas DATE/TIME sem TZ) |

---

## Tipos / enums (PostgreSQL)

```sql
CREATE TYPE student_status AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE weekday AS ENUM (
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
);

CREATE TYPE lesson_type AS ENUM ('REGULAR', 'MAKEUP', 'ONE_OFF');

CREATE TYPE lesson_status AS ENUM (
  'SCHEDULED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED'
);

CREATE TYPE cancellation_reason AS ENUM (
  'HOLIDAY',
  'VACATION',
  'TEACHER_CANCELLED',
  'STUDENT_CANCELLED',
  'OTHER'
);

CREATE TYPE monthly_charge_status AS ENUM ('PENDING', 'PAID', 'CANCELLED');
```

---

## Tabelas propostas

Convenção: `UUID` PKs, timestamps `TIMESTAMPTZ`, dinheiro `NUMERIC(12,2)`, textos longos `TEXT`.
`DATE` / `TIME` sem timezone; interpretação de negócio em `America/Sao_Paulo` (BR-070).

### students

```sql
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NULL,
  phone           TEXT NULL,
  start_date      DATE NOT NULL,
  monthly_fee     NUMERIC(12, 2) NOT NULL,
  status          student_status NOT NULL DEFAULT 'ACTIVE',
  notes           TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT students_monthly_fee_non_negative CHECK (monthly_fee >= 0)
);

CREATE INDEX students_status_idx ON students (status);
CREATE INDEX students_name_idx ON students (name);
```

### schedules

```sql
CREATE TABLE schedules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         UUID NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
  weekday            weekday NOT NULL,
  start_time         TIME NOT NULL,
  duration_minutes   INTEGER NOT NULL,
  valid_from         DATE NOT NULL,
  valid_until        DATE NULL,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT schedules_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT schedules_validity_range CHECK (
    valid_until IS NULL OR valid_until >= valid_from
  )
);

CREATE INDEX schedules_student_id_idx ON schedules (student_id);
CREATE INDEX schedules_student_active_idx ON schedules (student_id, active);
```

> Sem UNIQUE de “um schedule ativo por aluno” (BR-014).

### lessons

```sql
CREATE TABLE lessons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
  schedule_id          UUID NULL REFERENCES schedules (id) ON DELETE RESTRICT,
  date                 DATE NOT NULL,
  start_time           TIME NOT NULL,
  duration_minutes     INTEGER NOT NULL,
  type                 lesson_type NOT NULL,
  status               lesson_status NOT NULL,
  cancellation_reason  cancellation_reason NULL,
  content              TEXT NULL,
  exercises            TEXT NULL,
  observations         TEXT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT lessons_duration_positive CHECK (duration_minutes > 0)
);

CREATE INDEX lessons_student_id_idx ON lessons (student_id);
CREATE INDEX lessons_schedule_id_idx ON lessons (schedule_id);
CREATE INDEX lessons_student_date_idx ON lessons (student_id, date);
CREATE INDEX lessons_status_idx ON lessons (status);
CREATE INDEX lessons_type_idx ON lessons (type);
```

> Sem CHECK `REGULAR ⇒ schedule_id NOT NULL` (BR-020a = permitido + aviso na UI).
> Sem CHECK DB ligando `CANCELLED` e `cancellation_reason` — enforcement na API (ADR 003 / BR-037).

### tags

```sql
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tags_name_unique UNIQUE (name)
);
```

### lesson_tags

```sql
CREATE TABLE lesson_tags (
  lesson_id   UUID NOT NULL REFERENCES lessons (id) ON DELETE RESTRICT,
  tag_id      UUID NOT NULL REFERENCES tags (id) ON DELETE RESTRICT,
  PRIMARY KEY (lesson_id, tag_id)
);

CREATE INDEX lesson_tags_tag_id_idx ON lesson_tags (tag_id);
```

> Remover vínculo tag↔aula = `DELETE` apenas na linha de `lesson_tags` (não é hard delete de Lesson/Tag).
> `ON DELETE RESTRICT` alinha a BR-006 (não apagar Lesson/Tag com vínculos).

### monthly_charges

```sql
CREATE TABLE monthly_charges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
  reference_month   CHAR(7) NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL,
  due_date          DATE NULL,
  status            monthly_charge_status NOT NULL DEFAULT 'PENDING',
  paid_at           TIMESTAMPTZ NULL,
  notes             TEXT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT monthly_charges_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT monthly_charges_reference_month_format CHECK (
    reference_month ~ '^\d{4}-(0[1-9]|1[0-2])$'
  ),
  CONSTRAINT monthly_charges_student_month_unique UNIQUE (student_id, reference_month)
);

CREATE INDEX monthly_charges_student_id_idx ON monthly_charges (student_id);
CREATE INDEX monthly_charges_status_idx ON monthly_charges (status);
CREATE INDEX monthly_charges_reference_month_idx ON monthly_charges (reference_month);
```

---

## Constraints que o banco **não** deve tentar garantir no MVP

1. Filtro de listagem só `ACTIVE` (BR-004)
2. Sem hard delete / só inativar ou cancelar charge (BR-003, BR-006)
3. Exceção de horário só na Lesson (BR-012)
4. Aviso de UI para `REGULAR` sem schedule (BR-020a)
5. Sincronização operacional `active` vs preenchimento de `validUntil` (BR-015) — política de UX/serviço
6. Não gerar reposição automática (BR-023–027)
7. Cópia de `monthlyFee` → `amount` (BR-053)
8. Independência pagamento × aulas (BR-040, BR-045)
9. Regra das 4 aulas e transição de meses (BR-060–062)
10. Cálculo de frequência no mês corrente (BR-030–039)
11. Convenção Markdown (BR-051)
12. Interpretação de `DATE`/`TIME` em `America/Sao_Paulo` (BR-070)

---

## Índices — racional

| Índice | Motivo |
|--------|--------|
| `students(status)` | Lista padrão ACTIVE |
| `students(name)` | Busca/ordenação |
| `schedules(student_id)` | Agenda por aluno |
| `schedules(student_id, active)` | Horários em uso |
| `lessons(student_id, date)` | Histórico / dia / dashboard |
| `lessons(status)`, `lessons(type)` | Filtros e frequência |
| `tags(name)` | UNIQUE + busca |
| `monthly_charges` UNIQUE + status/mês | Listagens financeiras |
| `lesson_tags(tag_id)` | Lookup reverso |

---

## Integridade referencial

| FK | ON DELETE | Nota |
|----|-----------|------|
| schedules.student_id → students | RESTRICT | Alinha a BR-006 |
| lessons.student_id → students | RESTRICT | Idem |
| lessons.schedule_id → schedules | RESTRICT | Evita apagar schedule referenciado |
| monthly_charges.student_id → students | RESTRICT | Idem |
| lesson_tags → lessons/tags | RESTRICT | Evita apagar Lesson/Tag com vínculos; desvincular = delete na associação |

---

## O que deliberadamente **não** existe no schema

- Tabela `attendances`
- Parcelamento / pagamento parcial
- Tabela da “quinta semana / exercícios”
- Triggers de geração automática
- Tabela de usuários (auth v1 = env + JWT)

---

## Checklist da primeira migration

- [x] weekday enum `MONDAY`…`SUNDAY`
- [x] `reference_month` `CHAR(7)` `YYYY-MM`
- [x] `tags.name` UNIQUE
- [x] `lesson_tags` PK composta
- [x] múltiplos schedules `active` por aluno
- [x] sem CHECK REGULAR/scheduleId e sem CHECK cancellationReason
- [x] FKs `ON DELETE RESTRICT`
- [x] timezone operacional documentado (`America/Sao_Paulo`)
- [x] Migration `20260910170218_init_domain` criada e aplicada
- [x] CHECK constraints (`monthly_fee`/`amount` ≥ 0, durations > 0, validity range, `reference_month` format) na SQL da migration
