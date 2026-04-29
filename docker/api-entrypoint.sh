#!/bin/sh
# DelphiNet 6 API entrypoint (Bun edition)
# 1. Wait for the database (in case compose's healthcheck races us).
# 2. Push the Prisma schema (creates / updates tables).
# 3. Seed (idempotent).
# 4. Exec the Nest server with `bun run`.
#
# Migration / seed failures are logged but non-fatal — we still start the
# server so `docker compose logs api` shows the real cause via the API
# (instead of the container exiting and disappearing from the logs stream).

log() { echo "── [api-entrypoint] $* ──"; }

log "bun $(bun --version), prisma $(bunx prisma --version 2>/dev/null | head -1)"

# ── Wait for Postgres ───────────────────────────────────────────────────────
if [ -n "$DATABASE_URL" ]; then
  log "waiting for database"
  for i in $(seq 1 30); do
    if bun -e "const u=new URL(process.env.DATABASE_URL); const net=require('net'); net.createConnection({host:u.hostname,port:u.port||5432}).on('connect',()=>process.exit(0)).on('error',()=>process.exit(1));" 2>/dev/null; then
      log "database reachable"
      break
    fi
    sleep 1
  done
fi

# ── Schema push ─────────────────────────────────────────────────────────────
log "prisma db push"
if ! bunx prisma db push --schema prisma/schema.prisma --skip-generate --accept-data-loss; then
  echo "[api-entrypoint] WARNING: prisma db push failed; starting server anyway so logs are visible"
fi

# ── Seed (idempotent) ───────────────────────────────────────────────────────
log "seeding (bun run prisma/seed.ts)"
if ! bun run prisma/seed.ts; then
  echo "[api-entrypoint] WARNING: seed failed; continuing"
fi

# ── Start server ────────────────────────────────────────────────────────────
log "starting Nest server"
exec bun run dist/main.js
