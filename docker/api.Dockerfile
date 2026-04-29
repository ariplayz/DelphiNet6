# ─────────────────────────────────────────────────────────────────────────────
# DelphiNet 6 — API container
#
# Strategy: build the workspace, then use `pnpm deploy` to produce a fully
# self-contained, hoisted bundle for @delphinet/api. This avoids the pnpm
# symlinked-workspace gotcha where `node dist/main` from the wrong cwd cannot
# resolve dependencies (e.g. reflect-metadata).
#
# Layout in the final image:
#   /app                     ← deployed bundle (apps/api package + flat node_modules)
#     ├── dist/              ← built Nest output
#     ├── package.json
#     ├── node_modules/      ← all runtime deps, hoisted
#     └── prisma/            ← schema + seed (copied here so cwd is /app)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache openssl libc6-compat

# ─── deps: full workspace install (so we can build) ─────────────────────────
FROM base AS deps
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
# Copy prisma BEFORE install so @prisma/client postinstall sees the schema.
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --filter @delphinet/api... --filter delphinet6
RUN pnpm exec prisma generate --schema prisma/schema.prisma

# ─── builder: compile TS, then deploy a self-contained bundle ───────────────
FROM base AS builder
WORKDIR /workspace
COPY --from=deps /workspace ./
COPY . .
# Re-generate the Prisma client against the freshly-copied schema in case the
# deps stage cached an older one.
RUN rm -rf node_modules/.prisma node_modules/.pnpm/@prisma+client*/node_modules/.prisma \
 && pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter @delphinet/shared-types... build 2>/dev/null || true
RUN pnpm --filter @delphinet/api build

# `pnpm deploy` creates /deploy/api with all of @delphinet/api's runtime
# dependencies hoisted into a single flat node_modules. Module resolution
# from /deploy/api/dist/main.js will Just Work.
RUN pnpm --filter @delphinet/api deploy --prod --legacy /deploy/api

# Make sure the freshly-generated Prisma client is present in the deployed
# bundle (pnpm deploy copies node_modules but not the .prisma generated files
# that live inside @prisma/client at runtime).
RUN cp -r node_modules/.prisma /deploy/api/node_modules/.prisma 2>/dev/null || true \
 && cp -r node_modules/@prisma/client /deploy/api/node_modules/@prisma/client 2>/dev/null || true

# ─── runner: minimal image with the deployed bundle + prisma CLI + tsx ──────
FROM node:22-alpine AS runner
RUN corepack enable && apk add --no-cache openssl libc6-compat wget
WORKDIR /app
ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:${PATH}"

# Self-contained app + dependencies.
COPY --from=builder /deploy/api/ ./

# Prisma schema + seed live next to the bundle so the entrypoint can run them.
COPY --from=builder /workspace/prisma ./prisma

# Install the CLI tools we need at boot (prisma + tsx). Pinning explicitly so
# the runtime image never relies on the workspace's hoisted devDependencies.
RUN npm install --no-save --no-audit --no-fund --silent \
      prisma@5.22.0 \
      tsx@4.19.2 \
      @prisma/client@5.22.0 \
 && npx prisma --version

COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=6 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["/usr/local/bin/api-entrypoint.sh"]
