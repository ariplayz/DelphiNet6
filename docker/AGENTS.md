# AGENTS.md — `docker/`

All container build assets. Read root `AGENTS.md` first.

## Files

| File | Purpose |
|---|---|
| `api.Dockerfile` | Multi-stage build for the NestJS API. Bundles Prisma schema + entrypoint. |
| `web.Dockerfile` | Multi-stage build for the Vite SPA, served by nginx. |
| `api-entrypoint.sh` | Runs `prisma db push` → `tsx prisma/seed.ts` → `node dist/main`. |
| `Caddyfile` | Caddy reverse proxy. Routes `/api/*` and `/ws/*` to api, everything else to web. |
| `nginx.conf` | nginx config inside the web container. SPA fallback + `/api` proxy for local dev. |

## api.Dockerfile — important details

- **deps stage** copies `package.json` + `package-lock.json*` + the
  `prisma/` directory **before** `npm install`, so `@prisma/client`'s
  postinstall sees the schema.
- **deps + builder stages** both run `npx prisma generate
  --schema prisma/schema.prisma`. The builder regenerates against the
  freshly-copied source so a schema change always produces a fresh client.
- The root `node_modules/` is hoisted by npm workspaces, so the runner image
  copies the root `node_modules` (containing `@prisma/client`, the Nest
  runtime, the `prisma` CLI, and `tsx` for the entrypoint) alongside the
  built api package.
- `apk add --no-cache openssl` in both `base` and `runner` stages — Prisma
  needs it to detect the platform binary.
- The runner copies `prisma/` so `db push` and seed can run at startup.

## api-entrypoint.sh

```sh
prisma db push --skip-generate --accept-data-loss   # idempotent schema sync
npx tsx prisma/seed.ts || true                      # seed (non-fatal)
exec node dist/main                                 # start API
```

The seed is non-fatal so the API still boots if seed fails (e.g. transient
DB hiccup). The seed itself is idempotent.

## docker-compose.yml

Lives at repo root. Services:

| Service | Image | Notes |
|---|---|---|
| `caddy` | caddy:2-alpine | Public-facing on `:8090`. |
| `web` | built from `web.Dockerfile` | Static SPA via nginx. |
| `api` | built from `api.Dockerfile` | NestJS + Prisma. |
| `db` | postgres:16-alpine | Healthcheck enabled. |
| `cache` | redis:7-alpine | Sessions + BullMQ + pub/sub. |
| `mail` | axllent/mailpit | Dev SMTP catch-all on `:8025`. |

DB credentials come from `.env` via `${POSTGRES_PASSWORD}` etc. — **don't
hardcode**. Generate a strong password yourself (`openssl rand -hex 32`) and
put it in `.env` before the first `docker compose up`. If you change it
later you must `docker compose down -v` to wipe the volume so Postgres
re-initialises with the new password.

## Common changes

- **New service**: add to `docker-compose.yml`, expose only via Caddy.
- **New env var**: add to `.env.example`, document in `docs/getting-started.md`,
  reference via `${VAR}` in the service definition.
- **Tweaking nginx routing**: edit `nginx.conf` (only matters for direct
  `web:80` access; in production all traffic goes through Caddy).
