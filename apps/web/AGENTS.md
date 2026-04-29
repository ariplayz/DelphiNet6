# AGENTS.md — `apps/web`

React + Vite SPA. Read the **root `AGENTS.md`** first, especially the
mobile-first rules.

## Page conventions

```
src/pages/
  ClassesList/
    index.tsx          # default-exported page component
    components/        # page-private components
    hooks.ts           # page-private hooks
```

- Pages are lazy-loaded in `App.tsx` with `React.lazy`.
- The default export is the page component itself (no named export needed).
- Page-level data fetching happens in a `useEffect` + `useState` for now;
  React Query is on the roadmap.

## API calls

Use `apps/web/src/lib/api.ts`. Examples:

```ts
import { api } from '@/lib/api';

const classes = await api.get<Class[]>('/classes');
const created = await api.post<Class>('/classes', payload);
```

`api.ts` handles:
- Base URL (`/api`).
- `credentials: 'include'` for session cookies.
- Error envelope normalisation → throws `ApiError` with `status` + `message`.
- Global toast on 4xx/5xx (caller can opt out with `{ silent: true }`).

## Permissions

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';

const { user } = useAuth();
if (hasPermission(user, 'attendance.verify')) { ... }
```

For routes:

```tsx
<Route element={<RoleRoute permissions={['dorm.roll_call']} />}>
  <Route path="/dorms/roll-call/:id" element={<DormRollCallPage />} />
</Route>
```

## Theme & styling

- Tailwind config in `tailwind.config.ts`.
- Brand green: `#016745` (token `--brand`, Tailwind class `bg-brand`,
  `text-brand`, etc.).
- Dark mode is the only mode. Don't add `dark:` variants — base styles
  are dark.
- Spacing scale follows Tailwind defaults; touch-target minimum is
  `min-h-[44px]`.

## Mobile patterns

| Desktop | Mobile (`<md`) |
|---|---|
| Sidebar (always visible) | Slide-over drawer (hamburger) |
| Top utility bar | Bottom tab nav |
| `<Modal>` centre-sheet | `<Sheet>` bottom-sheet |
| Tables (`<Table>`) | Card stacks (`<CardList>`) |
| Hover-to-reveal actions | Always-visible primary action |

Use the existing primitives — don't roll your own. They already do the right
thing on mobile.

## Dashboard widgets

`react-grid-layout` v2 with `WidthProvider` / `Responsive` imported from
`react-grid-layout/legacy`. Layouts persist per `(userId, breakpoint)` to
the API. Widgets are registered in `src/pages/Dashboard/widgets/registry.ts`
with an id, default size, and React component.

## Forms

`react-hook-form` + `@hookform/resolvers/zod`. Schemas live next to the
form (`schema.ts`). Submit handlers should `await api.post(...)` and toast
success.

## Building / running

```bash
bun dev        # vite dev server with HMR proxy to /api
bun run build      # production bundle into dist/
bun run typecheck  # tsc --noEmit
```
