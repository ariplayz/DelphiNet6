# AGENTS.md — DelphiNet 6

> **Read this first.** Every agent (human or AI) working on DelphiNet 6 should
> skim this file before touching code. It captures the conventions, gotchas,
> and architectural decisions that aren't obvious from the source.

DelphiNet 6 is a complete TypeScript / React / NestJS rewrite of the legacy
DelphiNet 5 school portal. It is multi-tenant, event-driven, mobile-first,
and ships as a single `docker compose up -d --build` stack on **port 8090**.

---

## 1. The 60-second mental model

```
                 Caddy :8090 (reverse proxy + TLS in prod)
                ├── /        → web (nginx serving Vite build)
                ├── /api/*   → api (NestJS)
                ├── /ws/*    → api (Socket.IO gateway)
                └── /mail    → Mailpit (dev only)

NestJS API ── Prisma ──► Postgres 16
            ├──────────► Redis 7  (session store, BullMQ, pub/sub)
            └──────────► Event bus (in-process EventEmitter2 → typed events)

React/Vite SPA ── React Router v6 ── auth context ── role-gated routes
                                                  └── widget grid (react-grid-layout)
```

**Never bypass the event bus** for cross-module side effects. If module A
needs to react to something in module B, emit an event from B and listen in
A. Keep modules ignorant of each other.

---

## 2. Repo layout

```
apps/
  api/                   NestJS app, one module per business capability
    src/modules/
      auth/              Argon2 + session cookies + Passport strategies
      tenancy/           AsyncLocalStorage school-id middleware + Prisma $use filter
      database/          PrismaService (with tenancy middleware)
      event-bus/         TypedEventEmitter wrapper around @nestjs/event-emitter
      audit/             Audit log writer (listens to *.audited events)
      analytics/         Page-view + nav-graph stats for admin
      gateway/           Socket.IO gateway (live updates, presence)
      schools/           School CRUD (super-admin only)
      users/             User CRUD + role assignment
      roles/             Role catalogue + permission checks
      dashboard/         WidgetLayout + QuickLinks
      classes/           Classes, sessions, rosters
      attendance/        Roll calls, attendance entries, weekly snapshots
      dorms/             Dorms, rooms, captains, dorm roll calls
      schedule/          @nestjs/schedule cron jobs (weekly reset etc.)
  web/                   React + Vite SPA
    src/
      pages/             One folder per route. Lazy-loaded.
      layouts/           AppLayout, AuthLayout, mobile drawer/bottom-nav
      components/        Reusable UI primitives (Button, Card, Modal/Sheet, …)
      contexts/          AuthContext, SchoolContext, ToastContext
      lib/               api.ts (fetch wrapper), permissions.ts, time.ts
packages/
  shared-types/          DTO + enum types shared by api and web
  eslint-config/         Shared ESLint rules
prisma/
  schema.prisma          Single source of truth for the data model
  seed.ts                Idempotent seed (built-in roles + super admin)
docker/
  api.Dockerfile         Multi-stage; bundles prisma schema + entrypoint
  web.Dockerfile         Multi-stage; nginx serves Vite build
  api-entrypoint.sh      `prisma db push` → seed → `node dist/main`
  Caddyfile              Routes :8090
  nginx.conf             SPA fallback + /api proxy
scripts/
  server-install.sh      One-command bootstrap (idempotent, self-healing)
  watch-deploy.sh        Polls for new git tags
  deploy.sh              Down → checkout tag → up --build → health check
  delphinet-deploy.service  systemd unit for watch-deploy.sh
docs/                    GitHub Pages site (Jekyll, just-the-docs theme)
```

Each top-level folder has its own `AGENTS.md` with area-specific notes. **Read
those too** before working in that area.

---

## 3. Build / run / test commands

```bash
# pnpm binary lives here on dev workstations:
export PATH="$HOME/.local/share/pnpm:$PATH"

# Install deps
pnpm install

# Generate Prisma client (after schema changes)
DATABASE_URL="postgresql://x:x@x/x" pnpm exec prisma generate --schema prisma/schema.prisma

# API typecheck (the canonical sanity check before committing)
cd apps/api && npx tsc --noEmit

# Web typecheck + bundle
cd apps/web && npx tsc --noEmit && pnpm build

# Full local stack
docker compose up -d --build
docker compose logs -f api

# Seed (runs automatically inside the api container; manually:)
DATABASE_URL="postgresql://delphinet:delphinet@localhost:5432/delphinet" tsx prisma/seed.ts
```

> ⚠️ **Always run the API typecheck before committing.** Nest's runtime
> errors from missing Prisma types are obscure; tsc catches them instantly.

---

## 4. Hard rules (do not violate)

| Rule | Why |
|---|---|
| **Multi-tenant: every model except global ones gets a `schoolId`** and is filtered automatically by the Prisma `$use` middleware via `SchoolContextStorage`. | Tenant isolation. |
| **Never query Prisma without going through `PrismaService`.** | The middleware lives there. |
| **Cross-module communication = events.** No service may import another module's service directly except the database/auth/tenancy/event-bus core modules. | Avoids the spaghetti of DelphiNet 5. |
| **All UI must be mobile-first.** Touch targets ≥ 44px, `text-base` on inputs, modals become bottom sheets ≤ md, tables become card stacks on xs, use `h-[100dvh]` not `h-screen`, respect `pb-safe`. | Half the users are on phones. |
| **Theme is dark with `#016745` green accents.** Don't introduce new accent colours without updating the design tokens. | Brand consistency. |
| **Roles are checkboxes, not hierarchies.** A user can have any combination. Use `permissions.ts` helpers (`hasRole`, `hasAnyRole`) — never check role names inline. | Roles change; permission shape doesn't. |
| **Tuesday is the week boundary** (00:00 in school timezone, default America/Los_Angeles). Use `getCurrentWeekStart` / `getNextWeekStart` from `attendance.week.ts`. | Matches existing school operations. |
| **Attendance points are constants** in `attendance.constants.ts`. `RESTRICTION_THRESHOLD = 4`. | Single source of truth. |
| **Commit + push every phase. Tag at known-good points.** | Allows the auto-deploy watcher to pick up releases. |

---

## 5. Tenancy — how it actually works

`SchoolContextStorage` is an `AsyncLocalStorage<{ schoolId: string }>`. The
`TenancyMiddleware` runs early in the request pipeline, reads the user's
school from the session, and runs the rest of the request inside
`storage.run({ schoolId }, next)`.

`PrismaService` registers a `$use` middleware that, for any model in
`TENANTED_MODELS`, transparently injects `where.schoolId` (or sets it on
`create`). Models in `SKIP_TENANCY` are either truly global (e.g. `School`,
`Role`) or inherit tenancy through a parent (e.g. `RollCall` via
`ClassSession.class.schoolId`, `AttendanceEntry` via its `student.schoolId`).

**If you add a new model:** decide whether it's tenanted, add it to the right
list, and write a brief note in `apps/api/AGENTS.md` explaining why.

---

## 6. Roles, permissions, and the permission map

Roles are seeded by `prisma/seed.ts`. A user's permissions are the **union**
of permissions across all assigned roles. The full catalogue lives in the
seed file; current built-in roles include:

- `super_admin` — bypass everything (use sparingly).
- `school_admin` — full access within one school.
- `supervisor` — owns class roll-calls.
- `student_council` / `attendance_verifier` — verify or excuse attendance points.
- `residential_life` — manages dorms, sets dorm roll-call schedules.
- `dorm_captain` — runs dorm roll-call for assigned dorm + Mark Messy +1.
- `student` — default role for newly created users.
- (more pending — see Phase plan in `docs/PROGRESS.md`)

The frontend gates routes via `<RoleRoute permissions={[...]}>`. Backend
gates endpoints via `@Permissions(...)` decorator + `PermissionsGuard`.

Adding a permission: add the string to `seed.ts`, attach to roles that
should have it, restart the api (the seed runs in the entrypoint), and use
it via the helpers above.

---

## 7. Event bus

`TypedEventEmitter` (in `apps/api/src/modules/event-bus`) wraps Nest's
`EventEmitter2` with a typed event registry (see `event-bus.types.ts`). To
add a new event:

1. Declare the payload in `EventMap`.
2. Emit with `events.emit('namespace.event', payload)`.
3. Subscribe with `@OnEvent('namespace.event')` in any service.

Audit log is just an `@OnEvent('**.audited')` listener — emit
`xxx.audited` from any service to get a free audit trail row.

---

## 8. Frontend conventions

- **Routes**: defined in `apps/web/src/App.tsx` with `createBrowserRouter`.
  Each route lazy-loads its page module.
- **API calls**: always go through `apps/web/src/lib/api.ts`. It handles
  cookies, base URL, error envelope, and the global toast on 4xx/5xx.
- **State**: prefer route-loader fetches + React Query (when added). Avoid
  Redux. Local state with `useState`/`useReducer`.
- **Forms**: react-hook-form + zod resolver.
- **Styling**: Tailwind. Design tokens in `tailwind.config.ts` and
  `index.css` (CSS variables for theme colours).
- **Mobile**: see `docs/mobile-first.md` for the full pattern catalogue. TL;DR:
  - Sidebar collapses to a slide-over drawer on `<md`.
  - Bottom tab nav appears on `<md`.
  - Modals use the `<Sheet>` component on mobile.
  - All inputs `text-base` (16px) to suppress iOS zoom.
  - Touch targets `min-h-[44px]`.

---

## 9. Deployment

1. Tag a release (`git tag vX.Y.Z && git push --tags`).
2. The server's `delphinet-deploy.service` polls every 30 s, sees the new
   tag, and runs `deploy.sh`: `compose down` → `git checkout tag` →
   `compose up -d --build` → health check.
3. If the API health check fails, the watcher rolls back to the previous
   tag (see `deploy.sh`).

**Bootstrapping a fresh server:**

```bash
sudo bash -c 'curl -fsSL https://raw.githubusercontent.com/ariplayz/DelphiNet6/main/scripts/server-install.sh | bash'
```

The install script is **self-healing**:
- `--prune-tags` keeps tag refs consistent with origin.
- Auto-wipes the Postgres volume if it detects a credential mismatch (e.g.
  upgrading from the broken v0.1).
- `FRESH_INSTALL=1` forces a clean reinstall.
- Dumps API logs and prints recovery hints on failure.

---

## 10. Common gotchas (learned the hard way)

1. **Prisma client missing types after schema changes**: regenerate with
   `pnpm exec prisma generate --schema prisma/schema.prisma`. In Docker, the
   `api.Dockerfile` regenerates twice (deps + builder stages) with `rm -rf`
   first, so this should "just work" — but if you add a new model and the
   build fails complaining about a missing `XxxWhereInput`, that's the cause.
2. **react-grid-layout v2** exports `WidthProvider` / `Responsive` from the
   `react-grid-layout/legacy` subpath, not the root.
3. **AttendanceEntry / RollCall are NOT auto-tenanted** — they inherit via
   parent. Don't add `schoolId` to them.
4. **WidgetLayout has composite unique `(userId, breakpoint)`**, not
   `(userId, schoolId)`.
5. **`pnpm --filter delphinet6`** is required in the api Dockerfile to pull
   in the root devDeps (prisma CLI + tsx) needed by the entrypoint.
6. **Postgres only honours `POSTGRES_PASSWORD` on first init.** If you regen
   `.env` on an existing volume, you'll get auth-failed loops. The install
   script auto-wipes in this case; manually use `docker compose down -v`.
7. **Sudo nag `unable to resolve host DelphiNet6`** is harmless; add
   `127.0.1.1 DelphiNet6` to `/etc/hosts` if it bothers you.

---

## 11. Working as an AI agent

- **Plan before code.** The repo is large; rubber-duck non-trivial plans.
- **Update `docs/PROGRESS.md`** when you finish a phase.
- **Always commit + push at phase boundaries.** Tag if the stack runs.
- **Stay in your area.** If a task is "frontend only", don't touch
  `prisma/schema.prisma` even if you spot something. File an issue/note.
- **Mirror the existing module shape** when adding a new module (see
  `attendance/` as the canonical example: module, service, controller,
  dto/, constants, helpers, plus a vitest spec).

When in doubt, read the per-area `AGENTS.md` and the latest two checkpoints
in `~/.copilot/session-state/<session>/checkpoints/`.

---

## 12. Useful links

- **Live docs**: https://ariplayz.github.io/DelphiNet6/ (GitHub Pages)
- **Architecture deep-dive**: `docs/architecture.md`
- **Roles & permissions**: `docs/roles-and-permissions.md`
- **Mobile UX**: `docs/mobile-first.md`
- **Deployment**: `docs/deployment.md`
- **Phase progress**: `docs/PROGRESS.md`
