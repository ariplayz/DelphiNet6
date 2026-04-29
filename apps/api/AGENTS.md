# AGENTS.md — `apps/api`

NestJS app. Read the **root `AGENTS.md`** first.

## Module structure

Each module = one folder under `src/modules/X/` containing:

```
X/
  X.module.ts        # @Module() — imports/providers/exports
  X.controller.ts    # @Controller('x') — HTTP routes
  X.service.ts       # business logic, talks to PrismaService + TypedEventEmitter
  X.constants.ts     # magic numbers / enums
  dto/
    create-x.dto.ts  # class-validator + class-transformer DTOs
  X.spec.ts          # vitest unit test
```

## Adding a new module

1. `nest g module X` (or just create the folder).
2. Wire it into `app.module.ts` (`imports: [..., XModule]`).
3. If it has DB models, add them to `prisma/schema.prisma` and decide
   tenancy (see "Tenancy" section in root AGENTS.md).
4. Emit events for anything other modules might care about. Audit-relevant
   events end in `.audited`.
5. Add a `*.spec.ts` covering at least the happy path.
6. Run `npx tsc --noEmit` from `apps/api/`.

## Auth flow

- Login → `POST /api/auth/login` → Argon2 verify → session cookie (Redis).
- `SessionGuard` populates `req.user` and `req.school`.
- `TenancyMiddleware` puts `schoolId` into `AsyncLocalStorage`.
- `PermissionsGuard` reads `@Permissions('x.y.z')` metadata and checks the
  union of role permissions on `req.user`.

## Prisma usage

- **Always** inject `PrismaService`, never `PrismaClient` directly.
- For transactions: `await this.prisma.$transaction(async (tx) => { ... })`.
  The `tx` parameter has the same tenancy middleware applied.
- Avoid `findFirst({ where: { schoolId } })` — the middleware injects it.
  Just write `findFirst({ where: { name } })`.
- For raw SQL (rare), use `$queryRaw` and **manually** include the schoolId
  in the WHERE clause.

## Cron / scheduled jobs

`schedule` module uses `@nestjs/schedule`. Add a `@Cron(...)` method to a
provider in there. Current jobs:

- **Weekly point reset**: every Tuesday 00:01 in `SCHOOL_TIMEZONE`. Snapshots
  the prior week's points and clears the in-flight counts.

## Testing

Vitest. `pnpm --filter @delphinet/api test` from repo root, or
`pnpm test` from `apps/api/`. Tests should mock `PrismaService` and the
event emitter.

## Logging

Use Nest's `Logger` per-class: `private readonly log = new Logger(MyService.name)`.
Log levels: `error` for things that need a human, `warn` for recoverable
issues, `log` for state changes worth seeing in prod, `debug` for noise.
