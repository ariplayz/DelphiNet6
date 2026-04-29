# DelphiNet 6 Documentation

This folder is the **living plan** for DelphiNet 6. Future contributors (human
or AI) should read these in order:

1. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design, stack, modules,
   conventions, repo layout. Read this first.
2. [`PROGRESS.md`](./PROGRESS.md) — phased build plan with `TODO` / `IN
   PROGRESS` / `DONE` status per phase. **Update this file whenever a phase
   advances.** Each phase has a "What was done" log so the next contributor
   can resume without context loss.
3. [`DOMAIN.md`](./DOMAIN.md) — domain model inventory taken from the legacy
   DelphiNet 5 site (delphinet.delphian.org). Source of feature parity.
4. [`CONVENTIONS.md`](./CONVENTIONS.md) — coding/style/event conventions that
   keep the codebase modular and event-driven (no spaghetti).

## How to work on this project (for future agents)

1. Open `PROGRESS.md`, find the first phase whose status is not `DONE`.
2. Read its **Goals**, **Tasks**, and **Acceptance Criteria**.
3. Confirm dependencies (listed under **Depends on**) are `DONE`.
4. Implement. When you finish, set the phase's status to `DONE` and append a
   bullet to the **What was done** subsection describing what shipped (files
   touched, key decisions, anything non-obvious).
5. If you make architectural changes, update `ARCHITECTURE.md` in the same
   commit.

## Ground rules

- TypeScript everywhere. `tsc --noEmit` and `eslint` must pass.
- One Nest module per domain. Cross-module side-effects go through the typed
  event bus, **not** direct service calls.
- Every tenant-scoped table has `school_id`. The tenancy interceptor enforces
  it. Bypassing it requires explicit super-admin context.
- Every domain action that matters emits a typed event. Audit, analytics,
  notifications, and websockets are subscribers.
- No new markdown planning files outside `docs/`. Update existing ones.
