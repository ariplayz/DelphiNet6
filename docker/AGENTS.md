# AGENTS.md — `docker/`

All container build assets. Read root `AGENTS.md` first.

## Files

| File | Purpose |
|---|---|
| `api.Dockerfile` | Multi-stage build for the NestJS API. Bundles Prisma schema + entrypoint. |
| `web.Dockerfile` | Multi-stage build for the Vite SPA, served by nginx. |
| `api-entrypoint.sh` | Runs `prisma db push` → `bun run prisma/seed.ts` → `node dist/main`. |
| `Caddyfile` | Caddy reverse proxy. Routes `/api/*` and `/ws/*` to api, everything else to web. |
| `nginx.conf` | nginx config inside the web container. SPA fallback + `/api` proxy for local dev. |

## api.Dockerfile — important details

- **deps stage** copies `package.json` + `bunfig.toml` + the
  `prisma/` directory **before** `bun install`, so `@prisma/client`'s
  postinstall sees the schema.
- **deps + builder stages** both run `bunx prisma generate
  --schema prisma/schema.prisma` after `rm -rf` of any prior client output.
  This is necessary because bun's hoisted `.prisma/client` location isn't
  always overwritten cleanly when the schema changes.
- Filter `bun install --filter @delphinet/api... --filter delphinet6` —
  the `delphinet6` filter pulls in the **root devDeps** (Prisma CLI + tsx)
  required by the entrypoint at runtime.
- `apk add --no-cache openssl` in both `base` and `runner` stages — Prisma
  needs it to detect the platform binary.
- The runner copies `prisma/` so `db push` and seed can run at startup.

## api-entrypoint.sh

```sh
prisma db push --skip-generate --accept-data-loss   # idempotent schema sync
npx --no-install bun run prisma/seed.ts || true         # seed (non-fatal)
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
hardcode**. The `server-install.sh` script generates a random password on
first run; if you change it later you must `docker compose down -v` to wipe
the volume so Postgres re-initialises with the new password.

## Common changes

- **New service**: add to `docker-compose.yml`, expose only via Caddy.
- **New env var**: add to `.env.example`, document in `docs/getting-started.md`,
  reference via `${VAR}` in the service definition.
- **Tweaking nginx routing**: edit `nginx.conf` (only matters for direct
  `web:80` access; in production all traffic goes through Caddy).
