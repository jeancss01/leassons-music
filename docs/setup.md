# Setup do zero

Guia para rodar o Violão Diário numa máquina sem nada configurado (macOS/Linux).

## Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| Git | qualquer recente | clonar o repositório |
| Node.js | **22 LTS** | backend e frontend |
| Yarn | **1.x** (Classic) | gerenciador de pacotes |
| Docker Desktop | recente, com Compose | PostgreSQL |

### Instalar as ferramentas

```bash
# Node 22 (exemplo com nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
nvm use 22

# Yarn Classic
npm install -g yarn@1.22.22

# Conferir
node -v    # v22.x
yarn -v    # 1.22.x
docker -v
docker compose version
```

Abra o **Docker Desktop** e confirme que está rodando antes de seguir.

## 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd music-daily
```

## 2. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
```

Os valores padrão já batem com o `docker-compose.yml`. Ajuste se quiser:

- `DATABASE_URL` — Postgres local (`violao` / `violao` / `violao_diario`)
- `AUTH_USERNAME` / `AUTH_PASSWORD` — login da aplicação
- `JWT_SECRET` — troque em ambiente real

## 3. Instalar dependências (primeira vez)

Na raiz do monorepo:

```bash
yarn install:all
```

Instala root + backend + frontend e roda `prisma generate`.

## 4. Subir o banco e aplicar o schema

```bash
yarn db:up
yarn wait:db
yarn --cwd backend prisma:migrate
```

Se o Prisma pedir um nome de migration e a pasta `backend/prisma/migrations/` já existir no repo, confirme/aplique a migration existente (ex.: `init_domain`).

## 5. Rodar a aplicação

```bash
yarn start
```

Sobe o Postgres (se ainda não estiver), espera o healthcheck e inicia API + frontend juntos.

## 6. Acessar

| Serviço | URL |
|---|---|
| App (Angular) | http://localhost:4200 |
| API (NestJS) | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |

Login: usuário/senha definidos em `backend/.env` (`AUTH_USERNAME` / `AUTH_PASSWORD`).  
Padrão do `.env.example`: `admin` / `change-me`.

## 7. Parar

```bash
# Ctrl+C no terminal do yarn start
yarn stop   # derruba o container do Postgres
```

## Dia a dia (depois do setup)

```bash
yarn start
```

Não é necessário repetir `install:all` nem `prisma:migrate`, a menos que dependências ou migrations mudem.

## Problemas comuns

- **Porta 5432 / 3000 / 4200 ocupada** — feche o processo que estiver usando ou altere a porta.
- **Docker não sobe o DB** — Docker Desktop precisa estar aberto; confira com `docker compose ps`.
- **Erro de Prisma / tabelas inexistentes** — com o DB no ar, rode de novo `yarn --cwd backend prisma:migrate`.
- **Versão errada do Node** — use Node 22 (`node -v`); Angular 21 e Nest 11 esperam isso.
