---
title: Getting started
layout: default
nav_order: 2
---

# Getting started
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

- **Docker** 24+ with the Compose v2 plugin
- **Node 22+** and **pnpm 9+** (only if you plan to run the API or web outside containers)
- ~2 GB free RAM and ~3 GB disk for the full stack

## 60-second local run

```bash
git clone https://github.com/ariplayz/DelphiNet6.git
cd DelphiNet6
cp .env.example .env
docker compose up -d --build
```

Wait ~30 s for the API to migrate + seed, then open:

| URL | What |
|---|---|
| <http://localhost:8090> | The app |
| <http://localhost:8090/api/health> | API liveness probe |
| <http://localhost:8090/mail> | Mailpit dev inbox |

Default super-admin: `ari@aricummings.com` / `adminpassword`.
{: .warning }
> **Change the default password immediately** in any non-dev deployment.

## Local development (without containers)

If you want HMR + faster iteration:

```bash
# Terminal 1 — backing services only
docker compose up -d db cache mail

# Terminal 2 — install once
export PATH="$HOME/.local/share/pnpm:$PATH"
pnpm install
DATABASE_URL="postgresql://delphinet:delphinet@localhost:5432/delphinet" \
  pnpm exec prisma generate --schema prisma/schema.prisma

# Terminal 3 — API with watch
cd apps/api
DATABASE_URL="postgresql://delphinet:delphinet@localhost:5432/delphinet" \
SESSION_SECRET="dev" REDIS_URL="redis://localhost:6379" \
pnpm dev

# Terminal 4 — web with HMR
cd apps/web
pnpm dev    # http://localhost:5173 — proxies /api → :3000
```

## Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | – | Postgres connection string. |
| `POSTGRES_PASSWORD` | yes | – | Must match the password in `DATABASE_URL`. |
| `SESSION_SECRET` | yes | – | 32+ random bytes. The install script generates this. |
| `REDIS_URL` | yes | `redis://cache:6379` | Sessions + queues + pub/sub. |
| `SMTP_HOST` / `SMTP_PORT` | no | mailpit defaults | Outbound email. |
| `PORT` | no | `3000` | API listen port (inside container). |
| `NODE_ENV` | no | `production` | Set to `development` for verbose logs. |
| `SCHOOL_TIMEZONE` | no | `America/Los_Angeles` | Used for the Tuesday week boundary. |

A complete reference template lives in `.env.example`.

## Common tasks

### Reset the database

```bash
docker compose down -v       # destroys postgres + redis volumes
docker compose up -d --build
```

### Tail a service

```bash
docker compose logs -f api
docker compose logs -f web
```

### Run a one-off Prisma command

```bash
docker compose exec api npx prisma studio --schema prisma/schema.prisma
```

### Reseed

The seed runs on every API container start (idempotent), but you can force
it manually:

```bash
docker compose exec api npx tsx prisma/seed.ts
```
