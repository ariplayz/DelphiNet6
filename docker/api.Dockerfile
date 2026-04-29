FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache openssl

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
# Copy prisma schema BEFORE install so postinstall hooks see it.
COPY prisma ./prisma
# Install api workspace deps + the root dev deps (prisma CLI, tsx) which are
# needed at runtime for `prisma db push` and `tsx prisma/seed.ts`.
RUN pnpm install --frozen-lockfile \
      --filter @delphinet/api... \
      --filter delphinet6
# Force a clean Prisma client generation against the bundled schema.
RUN rm -rf node_modules/.prisma node_modules/.pnpm/@prisma+client*/node_modules/.prisma \
 && pnpm exec prisma generate --schema prisma/schema.prisma

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
# Re-generate after copying the rest of the source — guarantees the client
# matches the schema even if cached layers above are stale.
RUN rm -rf node_modules/.prisma node_modules/.pnpm/@prisma+client*/node_modules/.prisma \
 && pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter @delphinet/shared-types... build 2>/dev/null || true
RUN pnpm --filter @delphinet/api build

FROM node:22-alpine AS runner
RUN corepack enable && apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
# Schema + seed are needed at runtime for `prisma db push` and the seed step.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh
EXPOSE 3000
CMD ["/usr/local/bin/api-entrypoint.sh"]
