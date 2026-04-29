# DelphiNet 6

**Modern school portal** built with NestJS, React, and PostgreSQL.

## Quickstart

```bash
cp .env.example .env
docker compose up
```

- **App**: http://localhost:8090
- **API Health**: http://localhost:8090/api/health
- **Mailpit**: http://localhost:8090/mail

Default credentials (Phase 2): `ari@aricummings.com` / `adminpassword`

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

**Prerequisites**: Node.js 22+, pnpm 10+, Docker

```bash
# Install dependencies
pnpm install

# Start API in dev mode
pnpm dev:api

# Start web in dev mode
pnpm dev:web

# Type-check all packages
pnpm typecheck

# Run all tests
pnpm test
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
