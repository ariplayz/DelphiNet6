# AGENTS.md — `scripts/`

Server-side bash for bootstrapping and auto-deploying. Read root `AGENTS.md`
first.

## Files

| File | Purpose |
|---|---|
| `server-install.sh` | One-command bootstrap. Installs Docker, clones repo, generates `.env`, starts the stack, installs the systemd watcher. |
| `watch-deploy.sh` | Long-running loop: every `POLL_INTERVAL` seconds, fetches tags and runs `deploy.sh` if a new tag arrived. |
| `deploy.sh` | Tag deploy: `compose down` → `git checkout tag` → `compose up -d --build` → health check → record tag. |
| `delphinet-deploy.service` | Systemd unit that runs `watch-deploy.sh`. |

## Defaults (must stay in sync across all four files)

| Setting | Value |
|---|---|
| Run user | `delphinet` |
| Install dir | `/opt/delphinet6` |
| Repo | `https://github.com/ariplayz/DelphiNet6.git` |
| Poll interval | `30s` |
| Listen port | `8090` |

If you change any of these, **change all four files** (and update
`docs/deployment.md`).

## server-install.sh — design notes

The script is **idempotent and self-healing**. It will recover from:

1. A botched prior install at the same tag — `git reset --hard` before
   checkout.
2. Tag references stuck at an old version — `git fetch --tags --force
   --prune --prune-tags` reconciles with origin.
3. A stale Postgres volume from a prior tag with a hardcoded password —
   detects via the previously-deployed-tag file and auto-wipes.
4. A live Postgres volume whose password no longer matches `.env` —
   actively probes with `psql` after `up`, wipes + retries on auth failure.
5. Docker daemon transient failures — caller can re-run safely.

`FRESH_INSTALL=1 bash server-install.sh` forces a clean reinstall (wipes
all volumes, regenerates `.env`).

## deploy.sh — design notes

Triggered by the watcher when a new tag arrives. Steps:

1. `docker compose down --remove-orphans`
2. `git fetch --tags --force --prune --prune-tags`
3. `git checkout <new_tag>`
4. `docker compose up -d --build`
5. Poll `/api/health` for up to 2 min.
6. **On failure**: roll back to the previously-deployed tag and bring it
   back up.
7. Write the new tag (or rolled-back tag) to `scripts/.deployed-tag`.

If you change the rollback policy, document it here and in
`docs/deployment.md`.

## watch-deploy.sh — design notes

- Uses `git ls-remote --tags origin` to detect new tags without fetching
  the whole repo.
- Sorts tags semver-descending; only considers `v*` tags.
- If the latest tag != `.deployed-tag`, calls `deploy.sh <new_tag>`.
- Logs to stdout (systemd journals it).

## Shell rules

- `set -euo pipefail` in every script.
- Use `sudo -u "$RUN_USER"` for any operation that touches files in
  `$INSTALL_DIR` (which is owned by the run user).
- Print step headers with the `header` helper, status with `info` / `success`
  / `warn`. Don't `echo` directly — keep output uniform.
