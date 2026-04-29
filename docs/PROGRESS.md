# Build Progress

This is the **living todo list** for DelphiNet 6. Each phase has:

- **Status** — `TODO` / `IN PROGRESS` / `DONE` / `BLOCKED`.
- **Depends on** — phases that must be `DONE` first.
- **Goals** — what this phase delivers.
- **Tasks** — concrete checklist.
- **Acceptance** — how to know it is done.
- **What was done** — log appended by whoever finishes the phase.

> When you finish a phase: flip its status to `DONE` and append bullets to
> "What was done" describing files touched and decisions made. Future
> contributors will rely on this log.

Legend: `[ ]` open · `[x]` done.

---

## Phase 1 — Scaffold

- **Status:** DONE
- **Depends on:** —
- **Goals:** A `docker compose up` that boots the empty stack on
  **port 8090** with healthchecks green.
- **Tasks:**
  - [ ] pnpm workspace at repo root (`apps/api`, `apps/web`,
        `packages/shared-types`, `packages/eslint-config`).
  - [ ] Base `tsconfig.base.json`, ESLint, Prettier, Husky pre-commit.
  - [ ] `apps/api`: NestJS skeleton with `/api/health` returning `{ok:true}`.
  - [ ] `apps/web`: Vite + React + TS skeleton showing "DelphiNet 6".
  - [ ] `docker/api.Dockerfile`, `docker/web.Dockerfile`,
        `docker/Caddyfile` (routes `/`, `/api/*`, `/ws`, `/mail`).
  - [ ] `docker-compose.yml` with services: `caddy` (publishes `8090:8090`),
        `api`, `web`, `db` (postgres:16), `cache` (redis:7), `mail`
        (axllent/mailpit). Healthchecks on all.
  - [ ] Root `README.md` with quickstart.
- **Acceptance:** `docker compose up` → `curl http://localhost:8090/` shows
  the React shell; `curl http://localhost:8090/api/health` returns `{ok}`.
- **What was done:**
  - _(empty — fill in when complete)_

---

## Phase 2 — Database & Prisma

- **Status:** TODO
- **Depends on:** Phase 1
- **Goals:** Schema, migrations, and seeds for the security + analytics
  foundation.
- **Tasks:**
  - [ ] Prisma schema with: `School`, `User`, `Role`, `Permission`,
        `RolePermission`, `UserRole`, `Session`, `AuditLog`, `Pageview`.
  - [ ] Stub tables for every domain phase (empty fields ok) so future
        migrations are additive.
  - [ ] `pnpm db:migrate` and `pnpm db:seed` scripts.
  - [ ] Seed: super-admin `ari@aricummings.com` / `adminpassword`
        (argon2-hashed), default roles (`super_admin`, `school_admin`,
        `supervisor`, `attendance_verifier`, `program_viewer`,
        `ethics_officer`, `routing_handler`, `parent`, `student`, `staff`),
        full permission list, one demo school "Delphian — Sheridan".
- **Acceptance:** Fresh `compose up` runs migrations + seeds; super-admin
  exists in DB.
- **What was done:**
  - _(empty)_

---

## Phase 3 — Auth + RBAC + Tenancy

- **Status:** TODO
- **Depends on:** Phase 2
- **Goals:** Login flow, permission guard, tenant isolation.
- **Tasks:**
  - [ ] `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
        Argon2 password hashing. JWT in httpOnly secure SameSite=Lax cookie.
  - [ ] Session timeout endpoints
        `GET /api/auth/timeout-ms` and `POST /api/auth/renew`
        (parity with legacy `MilliSecondsUntilTimeOut`).
  - [ ] `@RequirePermission()` decorator + `PermissionGuard`.
  - [ ] `TenancyInterceptor` attaches `currentSchoolId` from JWT;
        Prisma middleware enforces `school_id` on read/write.
  - [ ] Super-admin school switcher via `X-School-Id` header.
  - [ ] Unit tests for guard, interceptor, password hashing, login.
- **Acceptance:** Logging in as super-admin returns a session; querying any
  tenant table without a `currentSchoolId` rejects.
- **What was done:**
  - _(empty)_

---

## Phase 4 — Event Bus + Audit + Sockets

- **Status:** TODO
- **Depends on:** Phase 3
- **Goals:** Typed event bus, audit log subscriber, websocket fan-out.
- **Tasks:**
  - [ ] `EventBusModule` wrapping `@nestjs/event-emitter` with typed
        `emit<E>(...)`. `EventRegistry` lives in `packages/shared-types`.
  - [ ] `AuditSubscriber` writes every event to `audit_log`.
  - [ ] Socket.IO gateway with redis adapter; relays events the user is
        permitted to see.
  - [ ] Frontend hook `useEvent('<name>', handler)`.
  - [ ] Tests: subscribers receive events; audit row written.
- **Acceptance:** Emitting `auth.login` from a controller writes an audit
  row and pushes to a connected socket.
- **What was done:**
  - _(empty)_

---

## Phase 5 — Users, Schools, Role assignment UI

- **Status:** TODO
- **Depends on:** Phase 3, Phase 4
- **Goals:** CRUD for users and schools; checkbox-grid role admin.
- **Tasks:**
  - [ ] User CRUD scoped to current school (super-admin can target any).
  - [ ] School CRUD (super-admin only).
  - [ ] Role CRUD (school-scoped).
  - [ ] Checkbox-grid UI: users × roles for assignment; permissions ×
        checkboxes for editing a role.
  - [ ] Emits `role.granted`, `role.revoked`, `user.created`,
        `school.created`.
- **Acceptance:** Super-admin can create a school + admin; that admin can
  log in, create users, and assign roles via checkboxes.
- **What was done:**
  - _(empty)_

---

## Phase 6 — Frontend Shell

- **Status:** TODO
- **Depends on:** Phase 3
- **Goals:** Reusable app shell, design system, auth guards.
- **Tasks:**
  - [ ] Tailwind + Radix + lucide configured. **Dark-mode only**, brand
        accent `#016745` — design tokens defined per
        `docs/ARCHITECTURE.md` (Theme section). `html.dark` always
        applied; no light-mode toggle in v1. Set `<meta
        name="theme-color" content="#016745">`.
  - [ ] React Router with nested layouts.
  - [ ] `AuthProvider`, `RequireAuth`, `<Can permission="..." />`.
  - [ ] Top nav mirroring legacy: Dashboard / Home / Students & School /
        Parents / Links.
  - [ ] OpenAPI client generation script
        (`pnpm gen:api` → `apps/web/src/shared/api/generated.ts`).
  - [ ] (No theme toggle in v1 — dark-only by design.)
- **Acceptance:** Logged-in user sees the shell; unauthenticated visits
  redirect to `/login`.
- **What was done:**
  - _(empty)_

---

## Phase 7 — Dashboard + Widgets + Quick Links

- **Status:** TODO
- **Depends on:** Phase 5, Phase 6
- **Goals:** Per-user dashboard with **adaptive, draggable, resizable
  widgets** matching the legacy gridster UX, plus quick links.
- **Tasks:**
  - [ ] Widget registry. Initial widgets:
        - Program Summary (links to full program)
        - Attendance Snapshot (current week points + restriction badge,
          fed by Phase 10b)
        - My Roll Calls Today (Phase 10 / Phase 16 — appears for
          supervisors and dorm captains)
        - Restriction List preview (for staff with `restriction.view`)
        - Announcements
        - Quick Links
  - [ ] Drag-to-rearrange + resize grid (e.g. `react-grid-layout`),
        responsive breakpoints, layout persisted per user per
        breakpoint (parity with legacy gridster behavior).
  - [ ] "Reset to default layout" action.
  - [ ] Quick links: add/remove/reorder; matches legacy
        "Add To My Links" / "Manage Quick Links".
  - [ ] Widget visibility is permission-aware (a widget with
        `requiredPermission` is hidden if the user lacks it).
- **Acceptance:** A user can drag, resize, add, and remove widgets;
  refresh preserves layout; a supervisor sees the "My Roll Calls Today"
  widget while a plain student does not.
- **What was done:**
  - _(empty)_

---

## Phase 8 — Programs + Templates

- **Status:** TODO
- **Depends on:** Phase 5, Phase 6
- **Goals:** Student programs (Math/Reading/Seminar/Practical checksheets),
  books-read log, progress graph, editable templates per form.
- **Tasks:**
  - [ ] Entities: `ProgramTemplate`, `ChecksheetTemplate`, `Program`,
        `Checksheet`, `ChecksheetItem`, `BookRead`.
  - [ ] Endpoints to view/edit a student's program (permission-gated).
  - [ ] Progress graph data endpoint + Recharts component.
  - [ ] Template editor for school admins / curriculum role.
  - [ ] Emits `program.checksheet_completed`, `program.book_logged`.
- **Acceptance:** A supervisor can mark items complete; the student's
  graph updates; a template change spawns the correct items for new
  students only.
- **What was done:**
  - _(empty)_

---

## Phase 9 — Classes + Schedules + Rosters

- **Status:** TODO
- **Depends on:** Phase 5, Phase 6
- **Goals:** People with `class.manage` can create classes, set roster,
  pick a supervisor, set time/location. All class kinds + schedules.
- **Tasks:**
  - [ ] Entities (school-scoped):
        - `Class { id, schoolId, kind, name, supervisorUserId, location,
          notes, createdAt }`.
        - `ClassSession { id, classId, startsAt, endsAt, dayOfWeek?,
          recurrenceRule? }` — supports one-off and recurring meetings
          (RRULE-style or simple weekly pattern).
        - `ClassEnrollment { classId, studentUserId, addedAt, addedBy,
          removedAt? }`.
  - [ ] `kind` enum: `academic`, `afternoon`, `night`, `seminar`,
        `student_service`, `club`, `after_class`.
  - [ ] Permissions: `class.manage` (create/edit/delete + assign
        supervisor + manage roster), `class.view`, `class.supervise`
        (granted implicitly when set as supervisor on a class — the role
        `supervisor` is the named version of this capability).
  - [ ] Admin UI:
        - List/create/edit class form (name, kind, supervisor picker,
          location, sessions editor).
        - Roster picker (search students, multi-add, remove).
  - [ ] Student/staff UI:
        - "My Schedule" page (calendar + list view) merging all classes
          the user is enrolled in or supervises.
        - "Class Detail" page (roster, sessions, location).
  - [ ] Emits: `class.created`, `class.updated`, `class.supervisor_changed`,
        `class.enrollment_added`, `class.enrollment_removed`.
- **Acceptance:** A user with `class.manage` creates a class with a
  supervisor and 3 students at Tue/Thu 10:00 in Room A; the supervisor
  sees it on their roll-call page (Phase 10); the students see it on
  their schedule.
- **What was done:**
  - _(empty)_

---

## Phase 10 — Roll Call + Attendance Points

- **Status:** TODO
- **Depends on:** Phase 9
- **Goals:** Roll-call UI for supervisors, attendance points (Here / Late
  / Absent / Excused), and reports.
- **Tasks:**
  - [ ] Entities:
        - `RollCall { id, classSessionId | dormRollCallSlotId, takenBy,
          takenAt, kind: 'class' | 'dorm_evening' | 'dorm_morning',
          locked: bool }`.
        - `AttendanceEntry { id, rollCallId, studentUserId, status:
          'here' | 'late' | 'absent' | 'excused', excuseReason?,
          pointsAwarded: int, createdBy, createdAt, updatedAt }`.
  - [ ] Point rules (constants in `attendance/points.ts`):
        - `here` → **0**
        - `late` → **2**
        - `absent` → **4**
        - `excused` → **0** (display label "Absent (excused)";
          `excuseReason` required and non-empty)
        - Dorm-morning "messy room" → **1** (Phase 17 hooks in here).
  - [ ] Roll-call page (gated to people who supervise ≥1 class or are a
        dorm captain):
        - Lists today's class sessions / dorm slots they own.
        - Per-session screen: list of student names, each row defaults
          to **Here selected**. Buttons in order: `Here`, `Late`. Once
          `Late` is clicked, an `Absent` button appears next to it.
          An `Excused` button is always available; clicking it opens a
          required reason modal.
        - Save commits a `RollCall` + child `AttendanceEntry` rows
          inside one transaction; emits `attendance.recorded` per
          student and `rollcall.completed` once.
        - After save the roll call is locked; edits require
          `attendance.amend` permission.
  - [ ] Reports (parity with legacy +/- pages):
        - Per-student running point total (week + cumulative).
        - +/- days by student, five-week +/- report.
        - Class roster with per-student totals.
  - [ ] Emits: `attendance.recorded`, `rollcall.completed`,
        `attendance.amended`.
- **Acceptance:** Supervisor opens roll-call for their class, marks one
  student late and one excused (must enter reason); save is atomic;
  the late student now has +2 points and the excused student has +0
  with reason visible in reports.
- **What was done:**
  - _(empty)_

---

## Phase 10b — Weekly Points Reset + Restriction List

- **Status:** TODO
- **Depends on:** Phase 10
- **Goals:** Weekly point cycle, automatic restriction at ≥4 points,
  Tuesday reset.
- **Tasks:**
  - [ ] `WeeklyPointSnapshot { id, schoolId, studentUserId,
        weekStart (Tuesday 00:00 in school timezone), points,
        restricted: bool, finalizedAt? }`.
  - [ ] Service computes a student's current-week points by summing
        `AttendanceEntry.pointsAwarded` since the most recent Tuesday
        00:00 in the school's timezone (school-configurable TZ).
  - [ ] Restriction logic: any time current-week points crosses **≥ 4**,
        emit `student.restricted`; if amendments drop below 4, emit
        `student.unrestricted`. Subscribers (notifications, dashboard
        widget) react.
  - [ ] Cron job runs every Tuesday 00:00 (school TZ) per school:
        - Snapshots prior week's totals into `WeeklyPointSnapshot`
          (with `restricted` final value).
        - Resets the active counter (the counter is computed, so the
          reset is implicit — the cron just persists the snapshot).
        - Emits `points.week_reset { schoolId, weekStart }`.
  - [ ] Restriction list page (gated by `restriction.view`): all
        currently-restricted students this week, with point breakdown
        and link to each entry.
  - [ ] Student dashboard widget: current week's points + restriction
        badge.
- **Acceptance:** A student accumulating 4 points mid-week appears on
  the restriction list immediately; on Tuesday at 00:00 school-time,
  the prior week is snapshotted and the active counter shows 0 again.
- **What was done:**
  - _(empty)_

---

## Phase 10c — Student-Council Verification

- **Status:** TODO
- **Depends on:** Phase 10b
- **Goals:** Students with the `attendance_verifier` (Student Council)
  role can review every point and either **verify** it or **excuse** it
  with a reason.
- **Tasks:**
  - [ ] Add permission `attendance.verify` (already in registry); seed a
        built-in role `student_council` bundling
        `attendance.verify` + `attendance.view_all`.
  - [ ] Extend `AttendanceEntry` with: `verificationStatus:
        'unverified' | 'verified' | 'excused_by_council'`,
        `verifiedBy?`, `verifiedAt?`, `councilExcuseReason?`.
  - [ ] Verification screen (gated by `attendance.verify`):
        - Table of every point this week (school-scoped), filterable by
          student, class, status.
        - Per-row actions: **Verify** (locks point as valid) or
          **Excuse** (opens reason modal, sets `pointsAwarded = 0`,
          `verificationStatus = 'excused_by_council'`).
        - Bulk-verify with confirmation.
  - [ ] Excusing recomputes weekly totals; if total drops below 4,
        emits `student.unrestricted` (Phase 10b subscriber removes
        them from the restriction list).
  - [ ] Audit: every verify/excuse writes to `audit_log` with actor,
        target student, reason.
  - [ ] Emits: `attendance.verified`, `attendance.council_excused`.
- **Acceptance:** A council member excuses a "late" point with a
  reason; the student's weekly total drops by 2; if they were
  restricted only because of that point, they are removed from the
  restriction list and notified.
- **What was done:**
  - _(empty)_

---

## Phase 11 — Routing Forms

- **Status:** TODO
- **Depends on:** Phase 5
- **Goals:** Workflow items routed between staff.
- **Tasks:**
  - [ ] `RoutingForm` entity + state machine.
  - [ ] My Routes To Handle, Route Lookup By Student, Start Route pages.
  - [ ] Emits `routing.started`, `routing.assigned`, `routing.completed`.
- **Acceptance:** A user starts an RF, it appears in another user's queue,
  who can handle/complete it.
- **What was done:**
  - _(empty)_

---

## Phase 12 — Success Stories

- **Status:** TODO
- **Depends on:** Phase 8
- **Goals:** Student entries with supervisor verification.
- **Tasks:**
  - [ ] `SuccessStory` entity.
  - [ ] Entry form for students.
  - [ ] Verification UI for supervisors; emits `success_story.verified`.
- **Acceptance:** Student submits, supervisor verifies, both see status
  update live (via socket).
- **What was done:**
  - _(empty)_

---

## Phase 13 — Off-course Correction (Cramming)

- **Status:** TODO
- **Depends on:** Phase 8
- **Goals:** Cram assignments when a student stalls.
- **Tasks:**
  - [ ] `CramAssignment` entity.
  - [ ] Assignment entry UI (supervisor) + completion (student).
- **Acceptance:** Supervisor assigns a cram; student marks complete; entry
  visible in their program history.
- **What was done:**
  - _(empty)_

---

## Phase 14 — Ethics Reports

- **Status:** TODO
- **Depends on:** Phase 5
- **Goals:** Write/Review reports, person history, by date.
- **Tasks:**
  - [ ] `EthicsReport` entity with status workflow.
  - [ ] Pages: Write/Review, Person Ethics History, Reports By Dates.
  - [ ] Permission-gated to `ethics.write` / `ethics.review`.
- **Acceptance:** Officer writes a report, another reviews it, history
  page lists it under the subject.
- **What was done:**
  - _(empty)_

---

## Phase 15 — College Applications

- **Status:** TODO
- **Depends on:** Phase 5
- **Goals:** Per-student college application tracker.
- **Tasks:**
  - [ ] `CollegeApplication` entity.
  - [ ] Tracker UI (statuses, deadlines, notes).
- **Acceptance:** Student/supervisor can add applications and update status.
- **What was done:**
  - _(empty)_

---

## Phase 16 — Dorms + Dorm Captains + Dorm Roll Calls

- **Status:** TODO
- **Depends on:** Phase 5, Phase 10, Phase 10b
- **Goals:** Boarding-school dorm management with rooms, captains, and
  morning + evening roll calls. Residential Life staff configure dorms
  and roll-call schedules; dorm captains run the actual roll call.
- **Tasks:**
  - [ ] Permissions seeded:
        - `reslife.manage` — Residential Life + School Admin.
        - `dorm.captain` — granted automatically when a user is set as
          captain on a dorm (also a stand-alone role for explicit
          assignment).
  - [ ] Entities (school-scoped):
        - `Dorm { id, schoolId, name, captainUserId?, notes }`.
        - `DormRoom { id, dormId, name, capacity }`.
        - `DormAssignment { id, dormRoomId, studentUserId, since,
          until? }`.
        - `DormRollCallSchedule { id, dormId, slot:
          'morning' | 'evening', timeOfDay, daysOfWeek[],
          allowsMessyRoomPoints: bool }`
          — Residential Life sets when the captain must take roll;
          `morning` slots may award the +1 "messy room" point.
        - `DormRollCallSlot { id, scheduleId, occursOn }` — the
          materialized "today's morning roll" the captain opens.
  - [ ] ResLife admin UI:
        - Dorm CRUD with rooms editor (add/rename/set capacity).
        - Room assignment grid (drag students into rooms or use a
          select). Validates capacity.
        - Captain picker (single user per dorm; setting it grants
          `dorm.captain` for that dorm).
        - Roll-call schedule editor per dorm (morning/evening times,
          days of week, whether messy-room points apply).
  - [ ] Dorm Captain UI:
        - Roll-call landing page lists their dorm's currently-open
          slots (today's morning + evening as configured).
        - **Evening roll call** — same UX as Phase 10
          (Here / Late→Absent / Excused-with-reason). Points: same
          values (0 / 2 / 4 / 0).
        - **Morning roll call** — same attendance UX **plus**, per
          student, a **"Messy Room" toggle button** that awards the
          student +1 attendance point (separate `AttendanceEntry`
          row with `kind = 'messy_room'`, `pointsAwarded = 1`,
          `note` field optional).
  - [ ] Reuses Phase 10's `RollCall` / `AttendanceEntry` model with
        `kind ∈ {'class','dorm_evening','dorm_morning'}` so points
        flow into the same weekly total used by Phase 10b restriction
        and Phase 10c council verification.
  - [ ] Reports:
        - Dorm list page (parity with `/student/dorms/dormlist.aspx`).
        - Per-dorm roll-call history.
  - [ ] Emits: `dorm.created`, `dorm.captain_changed`,
        `dorm.assignment_changed`, `attendance.recorded` (kind dorm),
        `attendance.messy_room_assessed`.
- **Acceptance:**
  - ResLife creates "North Hall" with 3 rooms, assigns 8 students,
    sets a captain, and configures a 7:00 morning roll + a 22:00
    evening roll Mon–Fri.
  - At 7:00 the captain sees "North Hall — Morning" on their roll-call
    page; marks one student late (+2) and one student's room as messy
    (+1); both points appear in that student's weekly total and feed
    into Phase 10b restriction logic and Phase 10c council
    verification just like class points.
- **What was done:**
  - _(empty)_

---

## Phase 17 — Photos

- **Status:** TODO
- **Depends on:** Phase 5
- **Goals:** Photo grid of students.
- **Tasks:**
  - [ ] Upload endpoint stores into volume `/data/uploads`.
  - [ ] Grid with form/class filter.
- **Acceptance:** Admin uploads a photo for a user; appears in grid.
- **What was done:**
  - _(empty)_

---

## Phase 18 — Reference content

- **Status:** TODO
- **Depends on:** Phase 6
- **Goals:** CMS-style admin-editable pages: Hard-To-Find Words, Math Facts,
  Meal Menus.
- **Tasks:**
  - [ ] Generic `ReferencePage` entity with markdown body + slug.
  - [ ] Public viewer + admin editor.
- **Acceptance:** Admin edits HTFW; users see the new content.
- **What was done:**
  - _(empty)_

---

## Phase 19 — Parent Portal

- **Status:** TODO
- **Depends on:** Phase 5
- **Goals:** Parents see read-only views of their child(ren).
- **Tasks:**
  - [ ] `ParentLink(parentUserId, studentUserId)` entity.
  - [ ] Parent dashboard listing linked students.
  - [ ] Read-only student info page (parity with
        `/Parent/ParentStudentInfoPage.aspx`).
- **Acceptance:** Parent logs in, sees their child's program/attendance,
  cannot edit.
- **What was done:**
  - _(empty)_

---

## Phase 20 — Analytics + Admin Stats Dashboard

- **Status:** TODO
- **Depends on:** Phase 4, Phase 6
- **Goals:** Pageview ingestion + admin charts.
- **Tasks:**
  - [ ] `POST /api/analytics/pageview` endpoint; emits `pageview.recorded`.
  - [ ] Frontend router listener fires it on every navigation.
  - [ ] Daily rollup tables refreshed by a cron service inside the api
        container (or pg_cron).
  - [ ] Admin dashboard page (gated by `analytics.view`):
        total users, users per school, DAU/WAU/MAU, top pages, navigation
        flows (from→to Sankey), logins over time, per-role activity.
- **Acceptance:** Navigating around as any user appears within seconds in
  admin charts.
- **What was done:**
  - _(empty)_

---

## Phase 21 — Notifications

- **Status:** TODO
- **Depends on:** Phase 4
- **Goals:** In-app + email notifications driven by events.
- **Tasks:**
  - [ ] In-app notification entity + bell icon UI fed by sockets.
  - [ ] Email subscriber sends via Mailpit (dev) using nodemailer.
  - [ ] User notification preferences (per event class).
- **Acceptance:** Verifying attendance triggers an in-app notification to
  the student and an email visible in Mailpit at `/mail`.
- **What was done:**
  - _(empty)_

---

## Phase 22 — E2E + Polish + Demo seed

- **Status:** TODO
- **Depends on:** Phases 8, 10, 20
- **Goals:** Confidence + a great first-run experience.
- **Tasks:**
  - [ ] Playwright smoke: compose up → login → dashboard renders.
  - [ ] Demo seed populating one school with: a few students, a supervisor,
        a parent, sample programs, a couple of attended classes, a
        verified attendance entry, an ethics report, a routing form, a
        success story.
  - [ ] README polish (screenshots, default credentials, troubleshooting).
  - [ ] UI pass: empty states, loading skeletons, error boundaries.
- **Acceptance:** Fresh clone → `docker compose up` → log in as super-admin
  → every nav item reaches a populated, working page.
- **What was done:**
  - _(empty)_
