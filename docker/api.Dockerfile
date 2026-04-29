# ─────────────────────────────────────────────────────────────────────────────
# DelphiNet 6 — API container (Node.js + npm edition)
#
# DelphiNet 6 uses Node.js (https://nodejs.org) as the runtime and npm as the
# package manager. NestJS is compiled to JavaScript by `nest build` and the
# compiled output is run with `node`.
#
# Layout in the final image:
#   /app
#     ├── dist/              ← built Nest output
#     ├── package.json
#     ├── node_modules/      ← all runtime deps
#     └── prisma/            ← schema + seed (cwd at boot is /app)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat python3 make g++

# ─── deps: install the entire workspace so we can build ─────────────────────
FROM base AS deps
WORKDIR /workspace
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/eslint-config/package.json ./packages/eslint-config/
# Copy prisma BEFORE install so @prisma/client postinstall sees the schema.
COPY prisma ./prisma
RUN npm install --include=dev --no-audit --no-fund
RUN npx prisma generate --schema prisma/schema.prisma

# ─── builder: compile TS, then prune to production deps ─────────────────────
FROM base AS builder
WORKDIR /workspace
COPY --from=deps /workspace ./
COPY . .
# Re-generate the Prisma client against the freshly-copied schema in case the
# deps stage cached an older one.
RUN npx prisma generate --schema prisma/schema.prisma
RUN npm run build --workspace @delphinet/shared-types --if-present
RUN npm run build --workspace @delphinet/api

# ─── runner: minimal image with only the API + runtime deps ─────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat wget

WORKDIR /app
ENV NODE_ENV=production

# Copy the built api app and its package.json/node_modules.
# Because npm hoists everything into a single root node_modules, module
# resolution from /app/dist/main.js works as long as we ship the root
# node_modules alongside the api package's own.
COPY --from=builder /workspace/apps/api/dist ./dist
COPY --from=builder /workspace/apps/api/package.json ./package.json
COPY --from=builder /workspace/node_modules ./node_modules

# Prisma schema + seed live next to the bundle so the entrypoint can run them.
COPY --from=builder /workspace/prisma ./prisma

COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=6 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["/usr/local/bin/api-entrypoint.sh"]
