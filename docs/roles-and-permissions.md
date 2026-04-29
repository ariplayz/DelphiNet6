---
title: Roles & permissions
layout: default
nav_order: 5
---

# Roles & permissions

DelphiNet 6's authorisation system is intentionally **flat and explicit**:

- **Roles are checkboxes**, not hierarchies. A user can hold any combination.
- **Permissions are strings** (`<area>.<action>`), assigned to roles.
- **A user's effective permissions = union of their roles' permissions.**
- **Super-admin bypasses checks** but is otherwise just another role.

## Built-in roles (current)

| Role key | Intended for | Notable permissions |
|---|---|---|
| `super_admin` | Site owners | Bypasses all permission checks. |
| `school_admin` | Per-school administrators | `*` within their school. |
| `supervisor` | Class supervisors / teachers | `class.roll_call`, `class.view_roster`. |
| `student_council` | Student council members | `attendance.verify`, `attendance.excuse`. |
| `attendance_verifier` | Anyone who can verify points (alias) | Same as student_council, scoped narrower. |
| `residential_life` | Boarding staff | `dorm.manage`, `dorm.schedule_roll_call`. |
| `dorm_captain` | Per-dorm student leaders | `dorm.roll_call`, `dorm.mark_messy`. |
| `student` | Default for newly-created users | `dashboard.view`, profile self-edit. |

Roles can be created and assigned per-school by anyone with
`role.manage`. The seed file is the source of truth for built-ins.

## Permission naming

`<area>.<action>` — lowercase, dot-delimited:

- `class.roll_call`, `class.view_roster`
- `attendance.verify`, `attendance.excuse`
- `dorm.manage`, `dorm.roll_call`, `dorm.mark_messy`
- `user.manage`, `role.manage`
- `school.manage` (super-admin only by default)
- `dashboard.view`, `analytics.view`

Add new permission strings only when there's a route or action that needs
gating. Don't pre-allocate.

## Backend usage

```ts
@Controller('attendance')
export class AttendanceController {
  @Post(':id/verify')
  @Permissions('attendance.verify')
  async verify(@Param('id') id: string, @Req() req) {
    return this.svc.verifyEntry(id, req.user.id);
  }
}
```

`PermissionsGuard` reads `@Permissions(...)` metadata, looks at
`req.user.permissions` (precomputed by `SessionGuard`), and either allows
the request or throws `ForbiddenException`.

## Frontend usage

### Gate a route

```tsx
<Route element={<RoleRoute permissions={['dorm.roll_call']} />}>
  <Route path="/dorms/roll-call/:id" element={<DormRollCallPage />} />
</Route>
```

### Gate a UI element

```tsx
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';

function RollCallButton() {
  const { user } = useAuth();
  if (!hasPermission(user, 'class.roll_call')) return null;
  return <button>Take roll</button>;
}
```

### Multi-permission

```ts
hasAnyPermission(user, ['attendance.verify', 'attendance.excuse']);
hasAllPermissions(user, ['dorm.roll_call', 'dorm.mark_messy']);
```

## Assigning roles in the admin panel

Admin → Users → pick a user → Roles tab → check the boxes you want →
Save. Backend audit-logs the change automatically (`user.roles.audited`).

## Adding a new role

1. Open `prisma/seed.ts`.
2. Add it to the `BUILT_IN_ROLES` array with its `key`, `name`,
   `description`, and `permissions: string[]`.
3. Restart the API — the seed is idempotent and adds the new role on
   next boot.
4. Document it in this file.

## Adding a new permission

1. Pick a string per the naming convention above.
2. Add it to whatever roles should hold it in `seed.ts`.
3. Use `@Permissions('your.permission')` on the relevant API route(s).
4. Use `hasPermission(user, 'your.permission')` in the UI.
5. Document it in this file.
