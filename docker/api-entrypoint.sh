#!/bin/sh
# DelphiNet 6 API entrypoint
# 1. Push the Prisma schema to the database (creates / updates tables)
# 2. Seed the database (idempotent: built-in roles + default super admin)
# 3. Start the Nest server
set -e

echo "── [api-entrypoint] prisma db push ──"
npx prisma db push --schema prisma/schema.prisma --skip-generate --accept-data-loss

echo "── [api-entrypoint] seeding (tsx prisma/seed.ts) ──"
# Seed is idempotent (creates built-in roles + default super admin if missing).
# Non-fatal: if seeding fails we still want the API to come up.
npx --no-install tsx prisma/seed.ts || echo "[api-entrypoint] seed failed (non-fatal); continuing"

echo "── [api-entrypoint] starting Nest server ──"
exec node dist/main
