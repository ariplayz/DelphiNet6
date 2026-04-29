# AGENTS.md — `prisma/`

Single source of truth for the data model. Read root `AGENTS.md` first.

## Files

- `schema.prisma` — models + generator + datasource.
- `seed.ts` — idempotent seed (built-in roles, super-admin, demo school).

## Conventions

- **`@@map("snake_case_table_name")`** on every model.
- **`@map("snake_case_column")`** on every field whose camelCase name doesn't
  match snake_case.
- Primary keys: `id String @id @default(uuid())`.
- Audit fields: `createdAt @default(now())` and `updatedAt @updatedAt` on
  every mutable model.
- Soft delete: prefer hard delete; for audit-sensitive entities use a
  `deletedAt DateTime?` and a partial index.

## Tenancy

The Prisma `$use` middleware in `PrismaService` auto-injects `schoolId`. Two
lists in `apps/api/src/modules/database/prisma.service.ts`:

- **`TENANTED_MODELS`** — get auto-filtered. Add new tenanted models here.
- **`SKIP_TENANCY`** — global models (e.g. `School`, `Role`) and child rows
  that inherit tenancy via a parent (e.g. `AttendanceEntry`, `RollCall`).

When you add a model, **decide explicitly** which list it goes into and
leave a comment in the schema explaining why.

## Migrations vs `db push`

- **Production runtime uses `prisma db push --skip-generate --accept-data-loss`**
  in the container entrypoint. This keeps schema in sync without managing
  migration files. (Acceptable because we don't have prod data yet.)
- **Once we have real data**, switch to `prisma migrate deploy` and check in
  migrations under `prisma/migrations/`.

## Seed

`npx tsx prisma/seed.ts` (also runs automatically in the api entrypoint).

- Idempotent — uses `upsert` by stable keys.
- Creates built-in roles, default super-admin
  (`ari@aricummings.com / adminpassword`), and a demo school in dev.
- **Don't seed test data here.** Use a separate `seed-demo.ts` if needed.

## After changing the schema

```bash
DATABASE_URL="postgresql://x:x@x/x" npx prisma generate --schema prisma/schema.prisma
cd apps/api && npx tsc --noEmit       # confirm Prisma types updated
```

If you hit `Namespace ... has no exported member 'XxxWhereInput'`, your
generate didn't finish or the deps stage in `docker/api.Dockerfile` is
caching an old client — see root AGENTS.md "common gotchas".
