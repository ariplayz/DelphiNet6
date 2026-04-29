---
title: Deployment
layout: default
nav_order: 4
---

# Deployment
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Quick start

DelphiNet 6 ships as a single Docker Compose stack. There is no install
script, no system service, and no host-side runtime — everything runs in
containers and the host only needs Docker + the Compose v2 plugin.

```bash
git clone https://github.com/ariplayz/DelphiNet6.git
cd DelphiNet6
cp .env.example .env        # then edit .env and set strong secrets
docker compose up -d --build
```

The app is then live at `http://<host>:8090`.

## Environment

Required variables in `.env` (see `.env.example` for the full list):

| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` | DB password — Postgres only honours this on first volume init. |
| `SESSION_SECRET` | Signs session cookies. Use 32+ random bytes. |
| `DATABASE_URL` | Must match the Postgres user / password / host / db. |

Generate strong secrets:

```bash
openssl rand -hex 32
```

## Updating

```bash
git pull
docker compose up -d --build
```

## Resetting state

```bash
docker compose down -v        # ALSO deletes the postgres + redis volumes
docker compose up -d --build
```

## TLS in production

Caddy can do automatic Let's Encrypt. Edit `docker/Caddyfile` and replace
`:8090` with your hostname:

```
delphinet.example.org {
  encode zstd gzip
  reverse_proxy /api/* api:3000
  reverse_proxy /ws/*  api:3000
  reverse_proxy        web:80
}
```

…then expose port 443 in `docker-compose.yml` and restart Caddy. ACME
certificate storage lives in the `caddy_data` volume.

## Backups

```bash
# Daily Postgres dump (cron on the host)
docker compose exec -T db pg_dump -U delphinet delphinet \
  | gzip > /var/backups/delphinet-$(date +%F).sql.gz
```

Restore:

```bash
gunzip -c backup.sql.gz | docker compose exec -T db psql -U delphinet delphinet
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `dependency failed to start: api unhealthy` | Postgres password mismatch from a prior volume init | `docker compose down -v` then bring the stack back up. |
| 502 from Caddy on first request | API still booting (cold-start migrations + seed) | Wait ~30s; Caddy retries automatically. |
| Web loads but `/api/*` returns 404 | API container crashed | `docker compose logs api`. |
