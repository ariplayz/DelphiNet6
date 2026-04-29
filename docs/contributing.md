---
title: Contributing
layout: default
nav_order: 8
---

# Contributing

This guide covers contributions from both human developers and AI agents.
Before doing anything else, **read [`AGENTS.md`](https://github.com/ariplayz/DelphiNet6/blob/main/AGENTS.md)** at the repo root — it's the canonical
working-style document.

## Workflow

1. Pick a phase from `docs/PROGRESS.md` (or an open issue).
2. Read the per-area `AGENTS.md` for the folder you'll be touching.
3. Plan the change. For non-trivial work, write a short design note in
   the PR description (or `~/.copilot/session-state/<id>/plan.md` if you're
   an AI agent in a Copilot session).
4. Implement, mirroring the structure of an existing similar module.
5. Run typecheck + tests:

   ```bash
   cd apps/api && npx tsc --noEmit
   cd apps/web && npx tsc --noEmit && npm run build
   npm test --workspaces --if-present
   ```

6. Commit with a clear `<type>(<scope>): <subject>` message
   (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`).
7. Push. If the stack runs end-to-end, **tag a release** so the auto-deploy
   picks it up:

   ```bash
   git tag v0.X.Y && git push --tags
   ```

## Module shape

When adding a new backend module:

```
src/modules/myfeature/
  myfeature.module.ts       # @Module — Prisma + Events + own service/controller
  myfeature.controller.ts   # routes; thin (delegate to service)
  myfeature.service.ts      # business logic; talks to Prisma + emits events
  myfeature.constants.ts    # magic numbers, status enums, defaults
  dto/
    create-myfeature.dto.ts
    update-myfeature.dto.ts
  myfeature.spec.ts         # at minimum, happy-path coverage
  AGENTS.md                 # if it has non-obvious quirks
```

Always **emit events for state changes** instead of importing other modules.
Append `.audited` to anything worth auditing.

When adding a new frontend page:

```
src/pages/MyFeature/
  index.tsx                 # default export — page component
  components/               # page-private UI
  hooks.ts                  # page-private hooks
  schema.ts                 # zod schemas if there's a form
```

Lazy-load the page in `App.tsx`:

```tsx
const MyFeature = React.lazy(() => import('./pages/MyFeature'));
```

Gate it via `<RoleRoute permissions={[...]}>` if it's not public.

## Don't

- **Don't import another module's service directly.** Use events.
- **Don't query Prisma without `PrismaService`.** The tenancy filter lives
  there.
- **Don't add hover-only UI.** Touch devices have no hover.
- **Don't introduce new accent colours** without updating the design tokens.
- **Don't hardcode role names** in business logic — use permission strings.
- **Don't bypass `lib/api.ts`** in the frontend — you'll lose error handling
  and toasts.
- **Don't tag a release** that doesn't pass `tsc --noEmit` in both apps.

## Pull request checklist

- [ ] `tsc --noEmit` passes in `apps/api/` and `apps/web/`
- [ ] Vite production build succeeds (`npm run build --workspace @delphinet/web`)
- [ ] Mobile look-and-feel checked at iPhone 14 viewport
- [ ] New routes are role-gated
- [ ] New permission strings are documented in `roles-and-permissions.md`
- [ ] New schema fields have `@map(...)` for snake_case columns
- [ ] New events follow `<module>.<entity>.<action>` naming
- [ ] If the schema changed, the entrypoint's `prisma db push` will handle
      it without data loss in production

## For AI agents specifically

- **Plan before code.** Use the rubber-duck pass for any non-trivial change.
- **Stay in your area.** Don't touch unrelated code "while you're there".
- **Update `docs/PROGRESS.md`** when you finish a phase.
- **Commit + push at phase boundaries**, even if the next phase isn't done.
- **Read the most recent two checkpoints** in
  `~/.copilot/session-state/<id>/checkpoints/` for prior context.
- **Mirror existing modules.** `attendance/` is the canonical example of
  what a complete module looks like (controller, service, constants,
  helpers, DTOs, vitest spec).
