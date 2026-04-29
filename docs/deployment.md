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

## One-command server install

On a fresh Debian / Ubuntu host:

```bash
sudo bash -c 'curl -fsSL https://raw.githubusercontent.com/ariplayz/DelphiNet6/main/scripts/server-install.sh | bash'
```

This will:

1. Create the `delphinet` system user.
2. Install Docker + the Compose v2 plugin.
3. Clone the repo to `/opt/delphinet6`.
4. Check out the latest `v*` git tag.
5. Generate a `.env` with random secrets.
6. Build + start the stack on port **8090**.
7. Install and enable `delphinet-deploy.service` (systemd unit) so the
   stack auto-updates on every new tag.

After it finishes the app is live at `http://<host>:8090`.

### Optional flags

| Flag | Effect |
|---|---|
| `FRESH_INSTALL=1` | Wipes all volumes + `.env` and reinstalls clean. |
| `INSTALL_DIR=/some/path` | Override `/opt/delphinet6`. |
| `RUN_USER=foo` | Override the `delphinet` system user. |
| `POLL_INTERVAL=60s` | Override the deploy watcher poll interval. |

Example clean reinstall:

```bash
FRESH_INSTALL=1 sudo bash -c 'curl -fsSL https://raw.githubusercontent.com/ariplayz/DelphiNet6/main/scripts/server-install.sh | bash'
```

## What the install script protects against

The script is **idempotent and self-healing**. Re-running is always safe.
It auto-recovers from:

- Stale Postgres volume from a prior tag (e.g. upgrading from v0.1) — auto
  wipes and reinitialises.
- Tag refs stuck on an old version — uses `--prune-tags`.
- Half-applied installs — `git reset --hard` before checkout.
- Auth failures after start — actively probes Postgres with the `.env`
  password and wipes the volume on failure.

If the API fails to start, the script dumps the last 80 lines of API logs
and prints a recovery hint.

## Auto-deploy on git tags

The `delphinet-deploy.service` systemd unit runs `scripts/watch-deploy.sh`,
which polls every `POLL_INTERVAL` for new tags. When it sees one:

1. `docker compose down --remove-orphans`
2. `git fetch --tags --force --prune --prune-tags`
3. `git checkout <new_tag>`
4. `docker compose up -d --build`
5. Health-check `/api/health` for up to 2 min.
6. **On failure**: roll back to the previously-deployed tag.
7. Persist the deployed tag to `scripts/.deployed-tag`.

```bash
# Live tail of the deployer
sudo journalctl -fu delphinet-deploy.service

# Manually trigger a deploy without waiting for the poll
sudo systemctl restart delphinet-deploy.service
```

## Cutting a release

```bash
# from your dev machine
git tag v0.2.0
git push origin v0.2.0
```

Within `POLL_INTERVAL` seconds, the server will pull and deploy.

{: .warning }
> **Tag only known-good commits.** The watcher will deploy any `v*` tag.

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
| `dependency failed to start: api unhealthy` | Postgres password mismatch from prior install | `FRESH_INSTALL=1` reinstall. |
| `Namespace ... has no exported member 'XxxWhereInput'` during build | Prisma client wasn't regenerated for a new model | Already fixed in v0.1.3+; rerun install to pull the fix. |
| Watcher never deploys a new tag | `.deployed-tag` is already set to that tag | `rm scripts/.deployed-tag && systemctl restart delphinet-deploy.service`. |
| `sudo: unable to resolve host …` warning spam | Host has no `/etc/hosts` self-entry | Append `127.0.1.1 <hostname>` to `/etc/hosts`. Cosmetic. |
