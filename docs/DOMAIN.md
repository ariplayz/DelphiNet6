# Domain Model — inventory from legacy DelphiNet 5

Source: live crawl of `delphinet.delphian.org` as student `acummings001`.
This is the **feature-parity target** for v1. Staff/admin features are
inferred from what students see (e.g. since attendance is "verified", a
verifier role exists; since programs are supervised, a supervisor role
exists).

## School structure

- **Forms 1–8** (K–12 equivalent). Forms 6–8 are high school.
- **4 campuses** — replicated as **schools** (tenants) in DN6.
- Each student progresses **at their own pace** on a per-student **program**
  with guidance from a **supervisor** (teacher).

## Programs (per student)

- Tree of **checksheets** organized in 4 streams:
  - Math
  - Reading
  - Seminar
  - Practical
- **Books Read** log.
- **Overall progress graph** (`/Program.mvc/OverallGraph/<id>`).
- Per-form **program templates** (editable by school admin / curriculum
  staff) instantiated for each student.

## Classes (multiple kinds)

All share roster + roll-call mechanics; modeled as one polymorphic entity
with `class_kind`:

- Academic
- Afternoon
- Night
- Seminar
- Student Service
- Clubs
- After Classes

Pages observed: rosters per kind, list of classes offered, all student
class schedules, student schedule & info.

## Attendance

- Roll calls per class kind (`acadallrollcalls`, `seminarallrollcalls`,
  `aftclassallrollcalls`, `clubsallrollcalls`, `ssallrollcalls`).
- Attendance sheet (`attendancesheet`).
- Reports: `+/-` days by student (`allplusminus`),
  five-week `+/-` (`fiveweekplusminus`).
- **Roll-call UX (DN6):** per student, default-selected `Here`; clicking
  `Late` reveals an `Absent` button; an always-available `Excused` button
  requires a reason and is displayed as "Absent (excused)".
- **Point values:** `Here` = 0, `Late` = 2, `Absent` = 4, `Excused` = 0,
  dorm-morning `Messy Room` = 1.
- **Weekly cycle:** points reset every **Tuesday 00:00** (school
  timezone). Students with **≥ 4 points** in the current week are
  **restricted** for the remainder of that week and listed on the
  restriction page. Snapshots are persisted weekly.
- **Verification (Student Council):** users with the
  `attendance_verifier` (Student Council) role see every point and may
  **verify** it or **excuse** it with a required reason; excusing
  zero-out the point and may auto-unrestrict.
- **Audit:** every record / amend / verify / excuse is audit-logged via
  the event bus.

## Routing Forms (RFs)

- Workflow items routed between staff.
- Pages: `RFsByPerson`, `rfsbystudent`, `startRF`.

## Success Stories

- Student entry (`SSEntryByPerson`).
- Supervisor verifies entries.

## Off-course Correction (Cramming)

- `studentoffCourseCram?other=other` — assignments when a student stalls.

## Ethics Reports

- Write/Review (`/Ethics/default.aspx`).
- Person history (`PersonEthicsHistory`).
- By date (`ReportsByDates`).

## College Applications

- `/student/College/default.aspx` — tracker.

## Dorms

- `/student/dorms/dormlist.aspx` — dorm assignments + lists.
- DN6 additions for boarding-school operation:
  - **Residential Life** + **School Admin** create/manage dorms, rooms
    (with capacity), and per-dorm roll-call schedules
    (morning/evening, days of week).
  - Each dorm has a **Dorm Captain** (a student) who runs the actual
    roll call.
  - **Evening dorm roll call** uses the standard
    Here/Late/Absent/Excused mechanic (0/2/4/0 points).
  - **Morning dorm roll call** adds a per-student **"Messy Room"**
    toggle that awards **+1 attendance point**, feeding the same
    weekly point system used for restriction (≥4 → restricted) and
    Student Council verification.

## Photos

- `/Photo.mvc` — student photo grid.

## Reference content (admin-editable)

- Hard-To-Find Words (`/curriculum/htfw.aspx`)
- Math Facts (legacy `/MFC` and new `mfc.delphian.org`)
- Meal Menus (external link in legacy; in DN6, ingest/host).

## Dashboard

- `/Dashboard.mvc` — per-user widgets (gridster), program summary,
  overall graph, "Add To My Links" (Quick Links).
- Quick Links: `/User.mvc/AddQuickLink`, `/User.mvc/ManageQuickLinks`.
- Session timeout endpoints: `/User.mvc/MilliSecondsUntilTimeOut`,
  `/User.mvc/RenewMilliSecondsUntilTimeOut`.
- Sidebar/menu loaded dynamically: `/Web.mvc/Sidebar/<pageId>`.

## Parent portal

- `/Parent/ParentStudentInfoPage.aspx` — read-only view of their student.

## Reports

- `/Report.mvc/ReportGenerator` — generic report generator
  ("Students By Term").

## Inferred staff/admin features (not visible to a pure student)

- User & role management (admin checkbox grid).
- School/tenant management (super-admin only).
- Program template editor.
- Class creation, scheduling, roster assignment.
- Attendance verification queues.
- RF queue management.
- Site analytics dashboard (DN6 addition).
