# DelphiNet 6

**Modern school portal for The Delphian School** — built with NestJS, React, and PostgreSQL.

DelphiNet 6 is the next-generation rewrite of DelphiNet 5. It is built primarily
for [The Delphian School](https://www.delphian.org/) (Sheridan, OR) and is
designed to be multi-tenant so other schools in the Delphi network — including
the various **Delphi Academies** in different cities across the country — can
be added as additional tenants from the super-admin panel.

## Quickstart

```bash
cp .env.example .env
docker compose up
```

- **App**: http://localhost:8090
- **API Health**: http://localhost:8090/api/health
- **Mailpit**: http://localhost:8090/mail

The initial super-admin email is `ari@aricummings.com`. The password is set
during the bootstrap seed (see your `.env` / first-run logs) and must be
changed on first login.

## Repository structure

```
DelphiNet6/
├── apps/
│   ├── api/           # NestJS REST API
│   └── web/           # React + Vite frontend
├── packages/
│   ├── shared-types/  # Shared TypeScript types
│   └── eslint-config/ # Shared ESLint configuration
├── docker/            # Dockerfiles, Caddyfile, nginx.conf
├── prisma/            # Database schema (Phase 2)
└── docker-compose.yml # Full stack: Caddy → API / Web / DB / Redis / Mail
```

## Development setup

**Prerequisites**: Node.js 22+, Bun 1.1+, Docker

```bash
# Install dependencies
bun install

# Start API in dev mode
bun dev:api

# Start web in dev mode
bun dev:web

# Type-check all packages
bun run typecheck

# Run all tests
bun run test
```

## Services (docker compose)

| Service | Image | Purpose |
|---------|-------|---------|
| caddy | caddy:2-alpine | Reverse proxy on :8090 |
| api | local build | NestJS API on :3000 |
| web | local build | React SPA via nginx :80 |
| db | postgres:16-alpine | PostgreSQL database |
| cache | redis:7-alpine | Redis cache |
| mail | axllent/mailpit | SMTP dev server |

## Docs

See [`docs/`](./docs/) for architecture, domain model, and conventions.
