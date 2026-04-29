# Architecture

## Goal

A modern replacement for the legacy ASP.NET DelphiNet 5
(`delphinet.delphian.org`). Single `docker compose up` exposes the entire
system on **port 8090** — frontend, backend, database, reverse proxy. Built
end-to-end in **TypeScript**, modular per domain, event-driven, multi-tenant.

## Stack

| Layer    | Choice                                                |
| -------- | ----------------------------------------------------- |
| Frontend | React 18 + Vite + TypeScript, Tailwind, Radix, lucide |
| Backend  | NestJS + TypeScript, `@nestjs/event-emitter`          |
| ORM/DB   | Prisma + PostgreSQL 16                                |
| Cache/Bus| Redis (sessions, socket pub/sub, queue)               |
| Realtime | Socket.IO via Nest gateway                            |
| Mail     | Mailpit (dev SMTP + web UI)                           |
| Proxy    | Caddy — single public listener on **:8090**           |
| Tests    | Vitest (unit), Playwright (e2e smoke)                 |
| Lint     | ESLint + Prettier + Husky                             |

## Topology

```
┌──────── docker compose (host port 8090) ───────────┐
│  caddy   ── /            → web (static Vite build) │
│          ── /api/*       → api (NestJS)            │
│          ── /ws          → api (Socket.IO)         │
│          ── /mail        → mailpit (dev only)      │
│  api     ── NestJS                                  │
│  web     ── nginx-served Vite build                 │
│  db      ── Postgres 16                             │
│  cache   ── Redis 7                                 │
│  mail    ── Mailpit                                 │
└─────────────────────────────────────────────────────┘
```

Only Caddy publishes a port. Everything else is on the internal docker
network.

## Repository layout

```
DelphiNet6/
├── apps/
│   ├── api/                 # NestJS app
│   │   └── src/modules/<domain>/
│   └── web/                 # React + Vite app
│       └── src/features/<domain>/
├── packages/
│   ├── shared-types/        # event registry, permission list, DTO types
│   └── eslint-config/
├── prisma/
│   └── schema.prisma
├── docker/
│   ├── Caddyfile
│   ├── api.Dockerfile
│   └── web.Dockerfile
├── docker-compose.yml       # publishes :8090 only
├── docs/                    # this folder — the living plan
├── package.json             # pnpm workspaces
└── README.md
```

## Multi-tenancy

- One Postgres database. Every tenant-scoped table has `school_id uuid not
  null` with an index `(school_id, ...)`.
- A NestJS **TenancyInterceptor** reads the JWT, attaches `currentSchoolId`
  to the request, and a Prisma middleware injects `where: { school_id }` /
  `data: { school_id }` automatically.
- A **super-admin** can switch active school via header `X-School-Id`.
- Program templates live per school but can be cloned cross-school by an
  admin helper.

## Roles & Permissions

- `Permission` is a string constant in
  `packages/shared-types/src/permissions.ts` (the canonical list).
- `Role` is a named bundle of permissions, scoped to a school (built-ins are
  global). Stored in `roles` + `role_permissions`.
- `User ↔ Role` is many-to-many via `user_roles`.
- Authorization in code:
  ```ts
  @RequirePermission('attendance.verify')
  verify(...) { ... }
  ```
- Built-in roles seeded: `super_admin`, `school_admin`, `supervisor`,
  `attendance_verifier`, `program_viewer`, `ethics_officer`,
  `routing_handler`, `parent`, `student`, `staff`.
- Admin UI: a checkbox grid (rows = users, cols = roles) for assignment, and
  a per-role editor with a checkbox grid of permissions.

## Event-driven core (no spaghetti)

- `EventBusModule` wraps `@nestjs/event-emitter` and exposes a strongly typed
  `emit<E extends keyof EventRegistry>(name: E, payload: EventRegistry[E])`.
- The `EventRegistry` type lives in `packages/shared-types` and is shared
  with the frontend.
- Cross-module side effects (audit, analytics, notifications, websocket
  fan-out) live in **subscribers**, never inline in domain services.
- Direct service-to-service calls are allowed only when the caller
  synchronously needs returned data.

Example events:
`auth.login`, `auth.login_failed`, `pageview.recorded`, `role.granted`,
`role.revoked`, `attendance.verified`, `program.checksheet_completed`,
`routing.assigned`, `ethics.report_filed`.

## Theme

- **Default and only theme is dark.** No light-mode toggle in v1.
- **Brand accent:** `#016745` (deep green). Used for primary buttons,
  active nav items, focus rings, links, progress bars, and chart series 1.
- Tailwind tokens (defined in `apps/web/tailwind.config.ts`):
  - `brand.DEFAULT` `#016745` (accent)
  - `brand.hover`   `#02835A` (lighter for hover)
  - `brand.active`  `#01533A` (darker for pressed)
  - `brand.fg`      `#E6F4EE` (text on accent)
  - `bg.base`       `#0B0F0D` (page background)
  - `bg.surface`    `#131916` (cards / panels)
  - `bg.raised`     `#1B231F` (popovers / modals)
  - `border.subtle` `#1F2A25`
  - `border.strong` `#2C3A33`
  - `fg.DEFAULT`    `#E6EDE9`
  - `fg.muted`      `#9BA8A2`
  - `danger`        `#E5484D`, `warn` `#F5A524`, `success` `#3FB950`
- Charts (Recharts): brand green is series 1; use a green-leaning,
  colorblind-safe palette (`#016745`, `#3FB950`, `#9DD9BD`, `#F5A524`,
  `#7C9CFF`).
- Sets `html { color-scheme: dark }` and `<meta name="theme-color"
  content="#016745">`.

## Frontend conventions

- Routes live in `apps/web/src/app/router.tsx`.
- Each domain has `apps/web/src/features/<domain>/` with `pages/`,
  `components/`, `hooks/`, `api.ts`.
- API client generated from Nest's OpenAPI via `openapi-typescript`.
- Auth provided through context; route guards via
  `<RequireAuth>` and `<Can permission="..." />`.
- Live updates via a typed Socket.IO hook
  `useEvent('attendance.verified', cb)` keyed off the same `EventRegistry`.
- Pageview tracking: a router listener `POST /api/analytics/pageview`
  on every navigation. The backend emits `pageview.recorded`; analytics
  module aggregates.

## Analytics (admin)

Tables: `pageviews(id, user_id, school_id, path, referrer, ts)` and rollup
tables refreshed by a cron job. Admin dashboard charts (Recharts):

- Total users, users per school, DAU / WAU / MAU.
- Top pages, navigation flows (from→to Sankey).
- Logins over time, failed-login counts.
- Per-role activity breakdown.

## Configuration & secrets

- `.env.example` is committed. Real `.env` is gitignored.
- `@nestjs/config` with a Zod schema validates env at startup.
- Default super-admin seeded once at first migration:
  `ari@aricummings.com` / `adminpassword` (changeable on first login).

## Testing

- `vitest` per app for unit tests; coverage reported.
- One Playwright e2e: `docker compose up` → login as super-admin → load
  dashboard → verify a tile renders.
- CI is out of scope for v1; commands documented in root `README.md`.
