---
title: API reference
layout: default
nav_order: 7
---

# API reference

The DelphiNet 6 REST API is mounted at `/api` and uses **session cookies**
for auth. All endpoints below are tenant-scoped to the authenticated
user's school unless noted otherwise.

{: .note }
> A machine-readable OpenAPI spec is on the roadmap. Until then, this page
> is the human-curated reference; for exact request/response shapes inspect
> the controllers and DTOs in `apps/api/src/modules/`.

## Conventions

- **Auth**: `POST /api/auth/login` sets a `session` cookie. Subsequent
  requests must include it (`credentials: 'include'` in fetch).
- **Errors**: JSON envelope `{ statusCode, message, error }` with
  appropriate HTTP status.
- **Pagination**: `?limit=N&offset=N` query params. Defaults `limit=50`,
  `offset=0`. Responses are bare arrays for now (will add `{ items, total }`
  envelope when callers need it).
- **Times**: ISO 8601 in UTC.
- **IDs**: UUID v4 strings.

## Endpoints by module

### Auth — `/api/auth`

| Method | Path | Notes |
|---|---|---|
| `POST` | `/login` | `{ email, password }` → 200 + `session` cookie. |
| `POST` | `/logout` | Clears the session cookie. |
| `GET` | `/me` | Returns the current user + permissions. |

### Users — `/api/users`

| Method | Path | Permission |
|---|---|---|
| `GET` | `/` | `user.manage` |
| `POST` | `/` | `user.manage` |
| `GET` | `/:id` | `user.manage` |
| `PATCH` | `/:id` | `user.manage` (or self) |
| `DELETE` | `/:id` | `user.manage` |
| `PUT` | `/:id/roles` | `role.manage` — body `{ roleIds: string[] }` |

### Roles — `/api/roles`

| Method | Path | Permission |
|---|---|---|
| `GET` | `/` | `role.manage` |
| `POST` | `/` | `role.manage` |
| `PATCH` | `/:id` | `role.manage` |
| `DELETE` | `/:id` | `role.manage` (built-ins protected) |

### Schools — `/api/schools`

| Method | Path | Permission |
|---|---|---|
| `GET` | `/` | `super_admin` |
| `POST` | `/` | `super_admin` |
| `PATCH` | `/:id` | `super_admin` |

### Dashboard — `/api/dashboard`

| Method | Path | Notes |
|---|---|---|
| `GET` | `/widgets` | User's widget layouts grouped by breakpoint. |
| `PUT` | `/widgets/:breakpoint` | Save layout for a breakpoint. |
| `GET` | `/quick-links` | User's quick links, ordered. |
| `PUT` | `/quick-links` | Replace all quick links. |

### Classes — `/api/classes`

| Method | Path | Permission |
|---|---|---|
| `GET` | `/` | authed |
| `POST` | `/` | `class.manage` |
| `GET` | `/:id` | authed |
| `PATCH` | `/:id` | `class.manage` |
| `DELETE` | `/:id` | `class.manage` |
| `GET` | `/:id/sessions` | authed |
| `POST` | `/:id/sessions` | `class.manage` |
| `GET` | `/mine/supervised` | `class.roll_call` — supervisor's classes |

### Attendance — `/api/attendance`

| Method | Path | Permission |
|---|---|---|
| `GET` | `/roll-calls/:id` | `class.roll_call` |
| `POST` | `/roll-calls/:id/entries` | `class.roll_call` — bulk upsert |
| `GET` | `/students/:id/points` | self or staff |
| `GET` | `/verification/queue` | `attendance.verify` |
| `POST` | `/entries/:id/verify` | `attendance.verify` |
| `POST` | `/entries/:id/excuse` | `attendance.excuse` — body `{ reason }` |
| `GET` | `/restricted` | staff |

### Dorms — `/api/dorms`

| Method | Path | Permission |
|---|---|---|
| `GET` | `/` | authed |
| `POST` | `/` | `dorm.manage` |
| `PATCH` | `/:id` | `dorm.manage` |
| `POST` | `/:id/rooms` | `dorm.manage` |
| `PUT` | `/:id/rooms/:roomId/occupants` | `dorm.manage` |
| `PUT` | `/:id/captain` | `dorm.manage` |
| `GET` | `/:id/roll-calls` | `dorm.roll_call` |
| `POST` | `/:id/roll-calls` | `dorm.roll_call` — open new roll call |
| `POST` | `/roll-calls/:id/messy` | `dorm.mark_messy` — `{ studentIds: string[] }` |

### Health & status — `/api`

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe. Returns `{ status: "ok" }`. |
| `GET` | `/ready` | Readiness — checks DB + Redis. |
| `GET` | `/version` | App version + git SHA. |

## WebSocket events (Socket.IO)

Connect to `/ws` with the session cookie. Events use the same naming as
the backend bus: `<module>.<entity>.<action>`.

| Event | Payload | Notes |
|---|---|---|
| `roll-call.updated` | `{ rollCallId }` | Sent to anyone viewing that roll call. |
| `attendance.entry.verified` | `{ entryId, studentId }` | For council UI. |
| `dorm.roll-call.opened` | `{ dormId, rollCallId }` | For dorm captains. |
| `presence.update` | `{ userId, status }` | Online indicator. |
