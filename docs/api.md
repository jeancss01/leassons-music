# API

## Spec

A OpenAPI é gerada automaticamente a partir dos decorators NestJS (`@nestjs/swagger`).

- Swagger UI: `http://localhost:3000/api/docs`
- JSON do spec: `http://localhost:3000/api/docs-json`

## Autenticação

Endpoints de domínio exigem `Authorization: Bearer <token>` (JWT obtido em `POST /auth/login`).

Erros de auth:

| Status | Quando |
|--------|--------|
| 401 | Token ausente ou inválido |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | public | App + database status |
| POST | `/auth/login` | public | Single-user login → JWT |
| GET | `/students` | JWT | Lista alunos (`status` default `ACTIVE`; `ALL` / `INACTIVE`) |
| POST | `/students` | JWT | Cria aluno |
| GET | `/students/:id` | JWT | Detalhe |
| PATCH | `/students/:id` | JWT | Atualiza (inclui `status`) |
| PATCH | `/students/:id/inactivate` | JWT | Inativa sem apagar histórico |
| POST | `/students/:id/schedule` | JWT | Cria horário recorrente do aluno |
| GET | `/students/:id/schedule` | JWT | Lista horários do aluno (inclui histórico) |
| PATCH | `/schedules/:id` | JWT | Atualiza somente o Schedule |
| GET | `/lessons` | JWT | Lista aulas (`studentId`, `from`, `to`, `status`) |
| POST | `/lessons` | JWT | Cria aula (`status=SCHEDULED`) |
| GET | `/lessons/:id` | JWT | Detalhe |
| PATCH | `/lessons/:id` | JWT | Atualiza dados (sem mudar status) |
| POST | `/lessons/:id/complete` | JWT | `SCHEDULED → COMPLETED` |
| POST | `/lessons/:id/no-show` | JWT | `SCHEDULED → NO_SHOW` |
| POST | `/lessons/:id/cancel` | JWT | `SCHEDULED → CANCELLED` (exige reason) |
| GET | `/students/:id/attendance` | JWT | Frequência derivada de Lessons |
| POST | `/monthly-charges` | JWT | Cria cobrança (copia `monthlyFee`) |
| GET | `/monthly-charges` | JWT | Lista (`studentId`, `referenceMonth`, `status`) |
| GET | `/monthly-charges/:id` | JWT | Detalhe |
| PATCH | `/monthly-charges/:id` | JWT | Atualiza `dueDate`/`notes` |
| POST | `/monthly-charges/generate` | JWT | Gera faltantes do mês (ACTIVE) |
| POST | `/monthly-charges/:id/pay` | JWT | `PENDING → PAID` |
| POST | `/monthly-charges/:id/unpay` | JWT | `PAID → PENDING` |

Não há `DELETE` de entidades de domínio (BR-006).
Não existe entidade/tabela `Attendance`.
Não há endpoint de cancelamento de MonthlyCharge nesta etapa (status `CANCELLED` existe no modelo; comando explícito = decisão pendente).

### Schedule — request/response

**POST `/students/:id/schedule`**

Request:

```json
{
  "weekday": "MONDAY",
  "startTime": "14:30",
  "durationMinutes": 60,
  "validFrom": "2026-01-15",
  "validUntil": null,
  "active": true
}
```

Response `201`: schedule criado.

Erros: `400`, `401`, `404` (student).

**GET `/students/:id/schedule`** — array (histórico incluído).

**PATCH `/schedules/:id`** — atualiza só o Schedule; não altera Lessons.

### Lesson — request/response

**POST `/lessons`**

Request:

```json
{
  "studentId": "…",
  "scheduleId": "…",
  "date": "2026-09-15",
  "startTime": "14:30",
  "durationMinutes": 60,
  "type": "REGULAR",
  "content": null,
  "exercises": null,
  "observations": null
}
```

- `type`: `REGULAR` | `MAKEUP` | `ONE_OFF`
- `scheduleId` opcional (ONE_OFF não exige; REGULAR normalmente tem)
- Status inicial sempre `SCHEDULED` (não aceito no body)

Response `201`:

```json
{
  "id": "…",
  "studentId": "…",
  "scheduleId": "…",
  "date": "2026-09-15",
  "startTime": "14:30:00",
  "durationMinutes": 60,
  "type": "REGULAR",
  "status": "SCHEDULED",
  "cancellationReason": null,
  "content": null,
  "exercises": null,
  "observations": null,
  "createdAt": "…",
  "updatedAt": "…"
}
```

Erros: `400`, `401`, `404` (student/schedule).

**GET `/lessons`**

Query: `studentId`, `from`, `to` (`YYYY-MM-DD`), `status`.  
Ordenação: `date ASC`, `startTime ASC`.

**PATCH `/lessons/:id`**

Atualiza dados da ocorrência (`date`, `startTime`, `durationMinutes`, `type`, markdown, `scheduleId`).  
Não muda `status`. Não altera Schedule.

**POST `/lessons/:id/complete`** → `200`, status `COMPLETED`  
**POST `/lessons/:id/no-show`** → `200`, status `NO_SHOW`  
**POST `/lessons/:id/cancel`** → `200`, body:

```json
{ "cancellationReason": "HOLIDAY" }
```

Erros de estado: `400` se a lesson não está `SCHEDULED`, ou cancel sem `cancellationReason`.  
Cancelamento **não** cria MAKEUP automaticamente.

### Attendance (frequência)

**GET `/students/:id/attendance`**

Derivado só de `Lesson` (sem tabela Attendance).

Query opcional:

- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`

Comportamento de período:

- ambos omitidos → **mês corrente** em `America/Sao_Paulo` (BR-039)
- ambos informados → intervalo inclusivo; exige `from <= to`
- só um informado → `400` (ambos são obrigatórios juntos)

Response `200`:

```json
{
  "studentId": "…",
  "from": "2026-09-01",
  "to": "2026-09-30",
  "completed": 3,
  "noShow": 1,
  "cancelled": 2,
  "totalConsidered": 4,
  "frequency": 0.75
}
```

- `frequency`: decimal em `[0, 1]` = `completed / (completed + noShow)`
- se `totalConsidered = 0` → `frequency = 0`
- `CANCELLED` e `SCHEDULED` não entram no denominador
- qualquer `type` com `COMPLETED` conta em `completed`

Erros: `400`, `401`, `404` (student).

### MonthlyCharge

**POST `/monthly-charges`**

```json
{
  "studentId": "…",
  "referenceMonth": "2026-09",
  "dueDate": "2026-09-10",
  "notes": null
}
```

- `amount` **não** é enviado: copiado de `Student.monthlyFee`
- status inicial: `PENDING`
- conflito aluno/mês → `409`

**GET `/monthly-charges`** — filtros `studentId`, `referenceMonth`, `status`; ordem `referenceMonth DESC`, `studentId ASC`.

**PATCH `/monthly-charges/:id`** — apenas `dueDate` e `notes` (sem mudar status/amount).

**POST `/monthly-charges/generate`**

```json
{ "referenceMonth": "2026-09" }
```

Response `200`:

```json
{
  "referenceMonth": "2026-09",
  "activeStudents": 3,
  "created": 2,
  "alreadyExisted": 1,
  "createdStudentIds": ["…"],
  "skippedStudentIds": ["…"]
}
```

- só alunos `ACTIVE`
- idempotente (não duplica)
- não cria Lessons

**POST `/monthly-charges/:id/pay`** → `PAID` + `paidAt`  
**POST `/monthly-charges/:id/unpay`** → `PENDING` + `paidAt=null`  
`CANCELLED` não pode ser pago.

## Conventions

- REST resource-oriented
- Sem prefixo `/v1` por enquanto
- Validação via `class-validator` (whitelist)
- Datas `YYYY-MM-DD`; horários `HH:mm` / `HH:mm:ss`
- Transições de status apenas por comandos explícitos

## Future (domínio)

Recursos planejados: `tags`, `dashboard`, geração mensal de aulas, cancelamento explícito de MonthlyCharge.
