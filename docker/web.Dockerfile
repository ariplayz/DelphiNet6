# DelphiNet 6 — Web container (Bun edition)
FROM oven/bun:1-alpine AS base

FROM base AS deps
WORKDIR /workspace
COPY package.json bun.lock* bunfig.toml* ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN bun install --frozen-lockfile || bun install

FROM base AS builder
WORKDIR /workspace
COPY --from=deps /workspace ./
COPY . .
RUN bun --filter @delphinet/web build

FROM nginx:alpine AS runner
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
