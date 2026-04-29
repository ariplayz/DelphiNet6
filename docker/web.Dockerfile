# DelphiNet 6 — Web container (Node.js + npm edition)
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /workspace
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN npm install --include=dev --no-audit --no-fund

FROM base AS builder
WORKDIR /workspace
COPY --from=deps /workspace ./
COPY . .
RUN npm run build --workspace @delphinet/web

FROM nginx:alpine AS runner
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
