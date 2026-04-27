# Uthaan Current State

_Last updated: 2026-04-27_

## Product Snapshot
- Uthaan is a school management platform for Pakistani private schools.
- Stack: Next.js App Router, TypeScript, Tailwind, Supabase, Vercel, lucide-react.
- Roles: `superadmin`, `admin`, `teacher`, `student`, `parent`.
- **Product maturity: ~8.8/10 — pilot-ready. Not a fully self-serve SaaS yet.**
  It is a guided pilot onboarding system suitable for controlled school pilots.
  Superadmin-assisted onboarding is required to create each school.

## Current Priorities
- improve product polish and reliability
- preserve RLS integrity and school scoping
- keep role restrictions production-safe
- prevent AI leakage to students and parents
- keep marketing copy accurate to what is actually live
- continue moving from manual operator workflows toward safer guided automation

## Current Routing
- `/` public marketing landing page
- `/demo` public demo / pilot request form
- `/login` app login
- `/dashboard` logged-in school dashboard
- `/superadmin` Uthaan operator control center
- `/superadmin/demo-requests` superadmin review queue for demo / pilot requests

---

## Recent Work (Latest)

### Demo Request Conversion / Pilot Creation
- Superadmin can convert eligible demo requests into schools.
- Eligible statuses: `new`, `contacted`, `approved`.
- Rejected and already-converted requests are blocked server-side.
- Conversion creates atomically:
  - `school` row
  - first admin Supabase Auth user (server-only generated password, never exposed)
  - `user_roles` row (`role = admin`, correct `school_id`)
  - pilot plan row
  - pilot `school_features` rows
  - updates demo request status to `converted`
- If final status update fails, created auth user and school are rolled back.
- Conversion success shows: school name, Pilot plan, admin email, and next setup steps.
- **No temporary password is shown, copied, or logged.**
- Admin handoff uses `/login` + Forgot Password / reset-password guidance.

### Superadmin Demo Request UX Polish
- Status updates show `Saving...`, `Saved ✓`, and inline errors — no silent saves.
- Converted requests show clear handoff information.

### Superadmin School Management Fixes
- Pilot setup checklist defaults compact: `"Pilot setup: x/8 ready"` with `View setup / Hide setup` toggle.
- Suspend / Activate now works with `pending / success / error` feedback.
- Delete is safely protected:
  - Hard-delete only allowed for schools with no linked operational data.
  - Schools with linked data show: _"This school has linked data and cannot be deleted safely. Suspend it instead."_
  - No cascade deletes added. No RLS/schema changes for this.

### Launch Dashboard (New / Low-Setup Schools)
- Newly created / low-setup schools now show an onboarding-first launch dashboard instead of mature operational analytics.
- Shown when fewer than 5/8 setup actions are complete.
- Uses **real school-scoped counts only** — no fake/placeholder metrics.
- Setup steps tracked:
  1. School created
  2. Admin account created
  3. Teachers added
  4. Students imported
  5. Timetable added
  6. Fee setup started
  7. First announcement posted
  8. Attendance marked
  9. Marks/results ready
- "Need help?" area honestly states setup videos are coming soon.
- Populated schools (5+ complete) still show the operational admin command-center dashboard.

### Teacher Onboarding (`/admin`)
- Admin and superadmin can create teacher accounts.
- Backend:
  - Creates Supabase Auth user with server-only generated password (never exposed).
  - Inserts `user_roles` row: `role = teacher`, correct `school_id`, `student_id = null`.
  - Admin can only create teachers for their own school.
  - Superadmin creates for the browsed/effective school.
- Duplicate email handling:
  - No duplicate teacher role.
  - No cross-school attachment.
  - No platform-admin attachment.
- Success state shows teacher email, `/login` URL, Forgot Password / reset guidance, and **Copy login instructions** button.
- Teacher subject/class assignment remains manual through Timetable.

### Student Import Onboarding Polish
- Required CSV fields are clearly documented with sample row guidance.
- Invalid CSV states show stable, friendly error copy.
- Import is school-scoped.
- Parent linking is **not** fully automated yet.
- Exact validation copy (used by tests):
  - Non-CSV or one-line invalid content → `"Need a header row and at least one student row."`
  - Header-only CSV → `"Need a header row and at least one student row."`
  - Missing columns → `"Missing columns: name, roll_no, class_num. Required: name, roll_no, class_num."`

### Account Login Handoff Standardization
- Admin and teacher handoff consistently uses:
  - Login URL: `/login`
  - Email: the created account email
  - Instruction: Use Forgot Password / reset password before first sign-in
- **Copy login instructions** button exists where appropriate.
- No password exposure in UI at any point.

### Multi-School Browsing / Effective School Scoping Fix
- Critical fix: sidebar pages were reading through logged-in user context instead of browsed school context.
- The following pages now use effective/browsed school context:
  `/students`, `/timetable`, `/fees`, `/attendance`, `/results`, `/marks`, `/announcements`, `/admin`
- When superadmin browses any school, all these pages show that school's data.
- If superadmin is not browsing a school where one is required, they are redirected to `/superadmin`.
- Normal admin behavior is fully preserved. RLS was not changed. Routes were not changed.
- Queries explicitly filter by `effective_school_id` where school-owned data is read.

### CI / Test Fixes
- Playwright bulk import tests: fixed after validation copy drift.
- Superadmin auth setup: now accepts `/superadmin` instead of assuming `/dashboard` for all roles.
- Shared test login helper: accepts `/dashboard` or `/superadmin` where appropriate.
- Fixed: parent-link lookup in `/admin` was building a huge `.in(...)` URL and could hit Supabase/undici header limits on large schools.
- Build passes.
- Bulk import Playwright subset: `7 passed` locally.
  ```
  npx playwright test tests/bulk-import.spec.ts --project=chromium
  ```

---

## Earlier Work (Still Live)

- Public marketing site at `/` with interactive storytelling (hero chips, role preview, before/after story).
- Public `/demo` flow for manual pilot capture.
- `demo_requests` review flow at `/superadmin/demo-requests`.
- Superadmin plan automation (`schools.plan` + `school_features` upsert on plan apply).
- Superadmin `Sign out` and `View website`.
- Shared app sidebar `View website`.
- Bulk-import happy-path selector stabilized using `student-list-panel`.
- Demo submit bug fix (server action isolation + try/catch).

---

## AI Features Status
- [x] Report card comment generator — live, teacher/admin only
- [x] Attendance alert summaries — live inside app / cron-based
- [x] Smart navigation command palette — live for staff
- [ ] Assignment feedback generator — planned / coming soon
- [ ] Quiz generator from topic — planned / coming soon
- [ ] Fee defaulter risk flag — planned
- [ ] Student performance insight — planned
- [ ] Announcement writer (EN + Urdu) — planned

## Feature Control System
- `school_features` is the source of truth for feature gating.
- Columns in use: `school_id`, `feature_key`, `enabled`, `monthly_limit`, `used_this_month`, `last_reset_at`.
- Seeded feature keys: `ai_report_comments`, `ai_assignment_feedback`, `ai_quiz_generator`, `ai_attendance_alerts`.
- Missing `school_features` rows are handled safely.
- `ANTHROPIC_API_KEY` is set in Vercel environment variables.

## School Plans
- `schools.plan` allowed values: `pilot`, `starter`, `growth`, `pro`, `enterprise`.
- Applying a plan updates `schools.plan` and upserts all four AI feature rows.
- Applying a plan does not reset `used_this_month` or `last_reset_at`.
- Manual per-feature overrides remain possible afterward.

## Plan Presets
- `starter`: all disabled, limit `0`
- `growth`: report comments enabled (`50`), attendance alerts enabled (`10`), rest disabled
- `pro`: report comments (`200`), attendance alerts (`50`), assignment feedback (`100`), quiz generator (`50`)
- `pilot`: report comments (`100`), attendance alerts (`20`), assignment feedback (`20`), quiz generator (`10`)
- `enterprise`: report comments (`1000`), attendance alerts (`200`), assignment feedback (`500`), quiz generator (`200`)

## Command Palette
- Global command palette: `Cmd+K`, sidebar button, mobile FAB.
- Role-aware. Uses Fuse.js search, live student search, and `/api/command-ai`.
- AI command navigation uses `claude-haiku-4-5-20251001`.
- Students/parents blocked from AI command navigation.
- Teacher/admin rate limit: `20` queries/hour.

## Help Video System
- `HelpButton` + `HelpModal` on page headers.
- `lib/helpVideos.ts` still contains placeholder YouTube IDs.
- Real videos still need to replace placeholders.

## Attendance Alert Agent
- Cron: every Monday 7am PKT (`vercel.json: 0 2 * * 1`).
- Flags students with repeated recent attendance issues.
- No WhatsApp Business API flow is live.

## Audit Log
- `lib/audit.ts` exports `writeAuditLog()`.
- Audit errors are swallowed and should never block the main flow.
- For admin/superadmin accountability only — not student/parent use.

## Superadmin
- Uthaan operator role, not a school role.
- Manages: schools, school status, demo requests, school/admin creation, browsing/impersonation, feature access, AI limits, plan assignment.
- `Stop impersonating` remains separate from `Sign out`.

## Business Model
- Pilot schools: `3 months free`, then choose a plan.
- Starter: `Rs. 12,000/month`, up to `200` students, core app, no AI.
- Growth: `Rs. 30,000/month`, up to `600` students, core + report comments + attendance alerts.
- Pro: `Rs. 65,000/month`, up to `1,500` students, more AI + higher limits.
- Enterprise: custom, `1,500+` students.
- Payment automation is not built yet — payments are manual first.
- WhatsApp Business API is planned later, not live.

---

## NOT Live (Do Not Claim)

| Feature | Status |
|---|---|
| WhatsApp Business API | Planned, not live |
| Payment automation | Manual only |
| Self-serve signup | Not live — guided onboarding only |
| Bulk teacher import | Planned |
| Parent linking/import | Not fully automated |
| Timetable import wizard | Planned |
| Fee setup wizard | Planned |
| Help/setup videos | Videos not recorded yet |
| Persistent setup milestones | Currently inferred from counts |

---

## Next Priorities

1. Record and link real setup help videos:
   - Login and reset password
   - Add teacher
   - Import students
2. Replace placeholder video IDs in `lib/helpVideos.ts` after videos are ready.
3. Build downloadable setup packet / credential instruction export.

**Later:**
- Bulk teacher import
- Parent linking/import
- Timetable import / setup wizard
- Fee setup wizard
- Persistent setup milestones (instead of inferred counts)
- Help videos inside the app
- WhatsApp/OTP (future, not now)

---

## Bulk Import / Tests
- Bulk import RLS-safe path uses `adminSupabase` + `school_id` on insert.
- Happy-path selector stabilized by scoping to `student-list-panel`.
- Superadmin flaky smoke test remains skipped unless explicitly revisited.

## Known Data Constraints
- `user_roles.school_id` is `NOT NULL`.
- Superadmin must still have a valid `school_id` in this database.
- Student tests may require a linked student record.
- Parent tests may require a `parent_student` link.
- Teacher workflows depend on timetable / class assignment data.
- `students.class_num` constrained to `1–8`.
- `announcements.priority` valid values: `normal`, `important`, `urgent`.

## Current Risk Areas
- Auth and RLS mismatches.
- School_id scoping bugs.
- Hidden selector drift in Playwright.
- Data-dependent smoke tests.
- Cross-role permission regressions.
- AI feature leakage to students/parents.
- Overclaiming unfinished features on marketing site.

## What Good Help Looks Like
- Inspect first.
- Identify exact root cause.
- Make the smallest safe change.
- Avoid unrelated rewrites.
- Preserve production behavior.
- SQL first for schema changes.
- Do not touch RLS unless explicitly required.
- Do not weaken role checks.
- Never expose AI to student/parent roles.
