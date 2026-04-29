# Conventions

These conventions keep the codebase modular, event-driven, and easy for the
next contributor (human or AI) to extend.

## Modules

- One Nest module per domain (`apps/api/src/modules/<domain>/`).
- Each module owns its entities, DTOs, controller, service, events, and
  tests. Modules import each other only for **types**, not for cross-domain
  business logic.
- Cross-domain side-effects go through the **event bus**.

## Files inside a module

```
modules/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts
├── <domain>.service.ts
├── <domain>.events.ts        # event constants & payload types
├── <domain>.subscriber.ts    # listens to other modules' events (optional)
├── dto/
│   ├── create-<x>.dto.ts
│   └── update-<x>.dto.ts
└── tests/
    └── <domain>.service.spec.ts
```

## Event bus rules

- All event names are typed via `EventRegistry` in
  `packages/shared-types/src/events.ts`. **No string literals at call sites.**
- A service that performs an action emits exactly one primary event for that
  action. Subscribers handle the side effects.
- A subscriber must be idempotent (events may be re-delivered).
- `audit`, `analytics`, `notifications`, and the websocket gateway are
  pure subscribers — they never expose mutating endpoints.

## Permissions

- Add new permission strings in
  `packages/shared-types/src/permissions.ts` and export them. Never inline a
  literal.
- Guard endpoints with `@RequirePermission('namespace.action')`.
- On the frontend, gate UI with `<Can permission="namespace.action" />`.

## Tenancy

- Every new entity that belongs to a school **must** include
  `schoolId String` and an index. Run the tenancy lint check
  (`bun run lint:tenancy`) — it scans `schema.prisma` for tenant-scoped models
  missing `schoolId`.
- Super-admin operations must be wrapped in `withSuperAdminContext(...)` to
  bypass the interceptor explicitly.

## DTO & validation

- `class-validator` on every controller input. No raw `any` in bodies.
- Frontend mirrors validation with Zod, generated from OpenAPI.

## Frontend

- Features live in `apps/web/src/features/<domain>/`. No domain logic in
  `app/` or `shared/`.
- Use `react-query` for server state. No global stores for server data.
- All API calls go through the generated client in `shared/api/`.

## Style

- Prettier (default) + ESLint. Run `bun run lint && bun run typecheck` before
  every commit.
- No comments unless the code genuinely needs clarification.
- Naming: `kebab-case` for files, `PascalCase` for components & classes,
  `camelCase` for variables, `SCREAMING_SNAKE_CASE` for constants.

## Commits

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- Update `docs/PROGRESS.md` in the same commit when a phase advances.
- All Copilot-authored commits include the required Co-authored-by trailer.
