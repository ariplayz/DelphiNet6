---
title: Architecture
layout: default
nav_order: 3
---

# Architecture
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## High-level diagram

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

## Modules (apps/api/src/modules)

| Module | Responsibility |
|---|---|
| `auth` | Argon2 password hashing, session cookies, `SessionGuard`, `PermissionsGuard`. |
| `tenancy` | `AsyncLocalStorage`-backed `SchoolContextStorage` + middleware. |
| `database` | `PrismaService` with the tenancy `$use` middleware. |
| `event-bus` | Typed wrapper around `@nestjs/event-emitter`. |
| `audit` | Listens for `*.audited` events and writes audit log rows. |
| `analytics` | Page-views, navigation graph, admin stats. |
| `gateway` | Socket.IO gateway for live updates and presence. |
| `schools` | Super-admin CRUD for tenant schools. |
| `users` | User lifecycle, role assignment. |
| `roles` | Built-in role catalogue + permission resolution. |
| `dashboard` | Widget layout persistence + quick links. |
| `classes` | Classes, sessions, rosters. |
| `attendance` | Roll-calls, attendance entries, weekly snapshots, council verification. |
| `dorms` | Dorms, rooms, dorm captains, dorm roll-calls (incl. Mark Messy). |
| `schedule` | `@nestjs/schedule` cron jobs (weekly reset). |

Future modules (planned): programs, success-stories, cramming, ethics,
routing-forms, college, photos, reference, parents, notifications.

## Tenancy

Multi-tenancy is **invisible** to most code. The middleware sets a
schoolId in `AsyncLocalStorage` on every authenticated request, and the
`PrismaService.$use` middleware:

- For **`TENANTED_MODELS`**: injects `where.schoolId` on read queries and
  sets `data.schoolId` on creates.
- For **`SKIP_TENANCY`** models: passes through unchanged. These are either
  truly global (`School`, `Role`) or inherit tenancy via a parent
  relationship (`AttendanceEntry` via `student.schoolId`,
  `RollCall` via `classSession.class.schoolId`, etc.).

This means you can write `prisma.class.findMany()` and never think about
`schoolId` — it Just Works. The trade-off: misclassifying a model in those
lists is a silent tenancy bug, so be careful.

## Events

Cross-module communication goes through `TypedEventEmitter`:

```ts
// emit
this.events.emit('attendance.entry.created', { entryId, studentId, points });

// subscribe
@OnEvent('attendance.entry.created')
async onCreated(payload: { entryId: string; studentId: string; points: number }) {
  // ...
}
```

Naming convention: `<module>.<entity>.<action>` (lowercase, dot-delimited).
Append `.audited` to anything that should produce an audit log entry — the
audit module subscribes to `**.audited`.

## Frontend architecture

- **Routing**: `react-router-dom` v6 `createBrowserRouter` with nested
  routes for layouts. Pages are `React.lazy`-loaded.
- **State**: route-local `useState`, `useReducer`. No Redux. React Query
  is on the roadmap for server state.
- **Auth**: `AuthContext` provides `user`, `school`, and `permissions`.
  `<RoleRoute permissions={[...]}>` gates routes. `hasPermission(user, p)`
  for inline checks.
- **Data fetching**: `lib/api.ts` wraps `fetch` with cookies, error
  handling, and toast.
- **Live updates**: a thin `socket.ts` wrapper over Socket.IO. Pages can
  `useEvent('roll-call.updated', cb)`.
- **Theming**: Tailwind with CSS variables for colours. Dark-only for now.
- **Mobile**: see [Mobile-first]({{ "mobile-first" | relative_url }}).

## Deployment topology

- **Single-node** Docker Compose stack on port 8090.
- **Caddy** terminates TLS in production (Let's Encrypt) and routes
  `/api/*` to the api container, `/ws/*` to the same, everything else
  to web.
- **Postgres** and **Redis** persist to named Docker volumes.
- **systemd** runs `watch-deploy.sh` to auto-deploy new git tags.

For HA / multi-node, the natural next step is to externalise Postgres
(managed RDS / Cloud SQL) and Redis (managed) and run multiple API
replicas behind Caddy. The code is already stateless — sessions live in
Redis, not in process memory.
