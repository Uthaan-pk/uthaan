## Product Overview
- Uthaan is a school management platform for Pakistani private schools.
- Stack: Next.js App Router, TypeScript, Tailwind, Supabase, Vercel, lucide-react.
- Roles in product: `superadmin`, `admin`, `teacher`, `student`, `parent`.
- Preserve RLS, school scoping, role restrictions, and production-safe minimal patches.
- **Product maturity: ~8.8/10 — pilot-ready. Not a fully self-serve SaaS.**
  It is a guided pilot onboarding system for controlled school pilots. Superadmin must create each school.

## Public Website And Routing
- `/` is the public marketing landing page.
- `/demo` is the public demo / pilot request form.
- `/login` is the app login.
- `/dashboard` is the logged-in school dashboard.
- `/superadmin` is the Uthaan operator control center.
- `/superadmin/demo-requests` lets superadmin review demo / pilot requests.

## Marketing Site
- Landing page lives in `components/marketing/LandingPage.tsx` + `LandingPage.module.css`.
- Website uses premium interactive product storytelling:
  - interactive hero insight chips
  - floating SaaS/dashboard hero preview
  - role-based preview for Admin / Teacher / Parent / Student
  - before/after scattered systems vs one-platform story
- Acquisition CTAs should point to `/demo`.
- Existing users should use `/login`.
- Hero should stay sleek and glassy, not a literal laptop/device mockup.
- Do not claim WhatsApp Business API is live.
- Do not claim payment automation is live.
- Do not claim auto self-serve signup is live.
- Onboarding copy should reflect the current flow:
  1. Request demo
  2. Uthaan sets up school
  3. School receives admin / teacher logins
  4. School starts using the app

## Demo Request Flow
- Public users can submit demo / pilot requests at `/demo`.
- Requests are stored in `demo_requests`.
- Superadmin reviews requests at `/superadmin/demo-requests`.
- Public users can insert only — cannot read, update, or delete requests.
- Requests can include `requested_plan`: `not_sure`, `starter`, `growth`, `pro`, `enterprise`.

## demo_requests Table
- Fields: `id`, `school_name`, `contact_name`, `role_title`, `email`, `phone`, `city`, `student_count`, `message`, `status`, `reviewed_at`, `reviewed_by`, `created_at`.
- Status values: `new`, `contacted`, `approved`, `rejected`, `converted`.
- Public users can insert only.
- Superadmin can select / update / delete.

## Demo Submit Reliability
- `/demo` previously had a production server error on submit.
- Root cause: `app/demo/actions.ts` mixed a `'use server'` action with a non-action exported constant; insert path lacked `try/catch`.
- Fix: keep server action file action-only; keep form initial state in client component; catch failures and return a friendly inline error state.

## Pilot Conversion (Superadmin → School Creation)
- Superadmin can convert eligible demo requests (`new`, `contacted`, `approved`) into live schools.
- Rejected and already-converted requests are blocked server-side.
- Conversion creates atomically:
  - `school` row
  - first admin Supabase Auth user (server-only generated password, **never exposed**)
  - `user_roles` row (`role = admin`, correct `school_id`)
  - pilot plan row
  - pilot `school_features` rows
  - updates demo request status to `converted`
- If final status update fails, created auth user and school are rolled back.
- Conversion success shows: school name, Pilot plan, admin email, and next setup steps.
- No password in UI. Admin handoff uses `/login` + Forgot Password / reset-password guidance.

## Login Handoff Pattern
- All admin and teacher account creation follows the same handoff:
  - Login URL: `/login`
  - Email: the created account email
  - Instruction: Use Forgot Password / reset password before first sign-in
- **Copy login instructions** button exists where appropriate.
- No password exposure in UI at any point.

## Launch Dashboard (New Schools)
- Schools with fewer than 5/8 setup actions complete show an onboarding-first launch dashboard.
- Uses real school-scoped counts only. No fake/placeholder metrics.
- Setup steps:
  1. School created
  2. Admin account created
  3. Teachers added
  4. Students imported
  5. Timetable added
  6. Fee setup started
  7. First announcement posted
  8. Attendance marked
  9. Marks/results ready
- Populated schools (5+ complete) show the operational admin command-center dashboard.
- "Need help?" area honestly states setup videos are coming soon.

## Teacher Onboarding
- Admin and superadmin can create teacher accounts at `/admin`.
- Backend creates Supabase Auth user (server-only password, never exposed) + `user_roles` row (`role = teacher`, correct `school_id`, `student_id = null`).
- Admin can only create teachers for their own school.
- Superadmin creates for the browsed/effective school.
- Duplicate emails handled safely: no duplicate role, no cross-school attachment, no platform-admin attachment.
- Teacher subject/class assignment remains manual through Timetable.

## Student Import
- Bulk CSV import, school-scoped.
- Required fields: `name`, `roll_no`, `class_num`.
- Validation copy (exact, used by tests):
  - Non-CSV or one-line invalid content: `"Need a header row and at least one student row."`
  - Header-only CSV: `"Need a header row and at least one student row."`
  - Missing columns: `"Missing columns: name, roll_no, class_num. Required: name, roll_no, class_num."`
- Parent linking is not fully automated yet.
- Bulk import uses `adminSupabase` + `school_id` on insert (RLS-safe path).

## Superadmin
- Superadmin is the Uthaan operator role, not a school staff role.
- Manages: schools, demo requests, pilot conversion, school/admin creation, school status, browsing/impersonation, feature access, AI limits, plan assignment.
- `View website` works for logged-in users because `/` is explicitly public in middleware.
- `Sign out` uses the existing `/auth/signout` route.
- `Stop impersonating` remains separate from `Sign out`.
- Pilot setup checklist defaults compact: `"Pilot setup: x/8 ready"` with `View setup / Hide setup` toggle.
- Suspend / Activate works with `pending / success / error` feedback.
- Delete is safely protected — hard-delete only for schools with no linked operational data; others show safe message.
- No cascade deletes. No RLS/schema changes for delete protection.

## Multi-School Browsing / Effective School Scoping
- When superadmin browses a school, the following pages show that school's data:
  `/students`, `/timetable`, `/fees`, `/attendance`, `/results`, `/marks`, `/announcements`, `/admin`
- Queries explicitly filter by `effective_school_id` where school-owned data is read.
- If superadmin is not browsing a school where one is required, they are redirected to `/superadmin`.
- Normal admin behavior is fully preserved. RLS was not changed. Routes were not changed.

## School Plans And Feature Automation
- `schools.plan` exists. Allowed values: `pilot`, `starter`, `growth`, `pro`, `enterprise`.
- `school_features` is the source of truth for actual AI feature enforcement.
- Applying a plan updates `schools.plan` and upserts `school_features` rows.
- Applying a plan does not reset `used_this_month` or `last_reset_at`.
- Manual per-feature overrides remain available.

## Plan Presets
- `starter`: all disabled, limit `0`
- `growth`: `ai_report_comments` enabled (`50`), `ai_attendance_alerts` enabled (`10`), rest disabled
- `pro`: report comments (`200`), attendance alerts (`50`), assignment feedback (`100`), quiz generator (`50`)
- `pilot`: report comments (`100`), attendance alerts (`20`), assignment feedback (`20`), quiz generator (`10`)
- `enterprise`: report comments (`1000`), attendance alerts (`200`), assignment feedback (`500`), quiz generator (`200`)

## AI Features
- `ANTHROPIC_API_KEY` is set in Vercel environment variables, not in repo.
- Model in use: `claude-haiku-4-5-20251001`.
- Report card comment generator is live for teacher / admin only.
- Attendance alert summaries are live inside the app and cron-based.
- Smart navigation command palette is live for staff.
- Assignment feedback generator is planned / coming soon.
- Quiz generator from topic is planned / coming soon.
- Students and parents must never see AI tools.
- AI gating is school-aware through `school_features`. Monthly usage limits enforced where implemented.

## Command Palette
- Global command palette: `Cmd+K`, sidebar button, mobile FAB.
- Role-aware. Uses Fuse.js search, live student search, and `/api/command-ai`.
- AI command navigation uses `claude-haiku-4-5-20251001`.
- Students / parents blocked from AI command navigation.
- Teacher / admin limit: `20` queries per hour.

## Help Video System
- `HelpButton` + `HelpModal` are used on page headers.
- `lib/helpVideos.ts` still contains placeholder YouTube IDs.
- Real recorded help videos are still pending.
- Priority videos to record: Login/reset, Add teacher, Import students.

## Bulk Import And Tests
- Bulk import RLS-safe path uses `adminSupabase` + `school_id` on insert.
- Bulk-import happy-path selector stabilized by scoping to `student-list-panel`.
- Playwright bulk import tests fixed after validation copy drift.
- Superadmin auth setup accepts `/superadmin` (not `/dashboard`) for superadmin role.
- Shared test login helper accepts `/dashboard` or `/superadmin` where appropriate.
- Superadmin flaky smoke test remains skipped unless explicitly revisited.

## Audit Log
- Table: `audit_logs`.
- `lib/audit.ts` exports `writeAuditLog(...)`.
- Audit failures should not block main flows.
- For admin / superadmin-level accountability, not students / parents.

## Business Model
- Pilot schools: `3 months free`, then choose a plan.
- Starter: `Rs. 12,000/month`, up to `200` students, core app, no AI.
- Growth: `Rs. 30,000/month`, up to `600` students, core + report comments + attendance alerts.
- Pro: `Rs. 65,000/month`, up to `1,500` students, more AI + higher limits.
- Enterprise: custom, `1,500+` students, custom setup / high limits.
- Payment automation is not built yet — payments are manual first.
- WhatsApp Business API is planned later, not live.

## Onboarding Reality
- Pakistani schools expect done-for-you onboarding.
- Current best flow:
  1. Website
  2. `/demo` request
  3. Superadmin review → contact school
  4. Convert / create school + admin account (guided, in-app)
  5. Assign pilot plan / features
  6. School logs in at `/login` → launch dashboard setup
- Future roadmap:
  - Bulk teacher / student / parent account generator
  - Downloadable credentials / setup packet
  - Persistent setup milestones (not inferred counts)
  - Help videos inside the app
  - Phone / OTP login or WhatsApp-based parent access (later)

## Attendance Alert Agent
- Cron: every Monday 7am PKT (`vercel.json: 0 2 * * 1`).
- Flags students with repeated recent attendance issues.
- No WhatsApp Business API flow is live.

## Audit / Seed Notes
- Seed / demo school values in this repo context:
  - `school_id: a1b2c3d4-0000-0000-0000-000000000001`
  - `islamiat.teacher user_id: d29e612a-b1da-4ee6-89ee-f8ac218115e8`
  - `admin user_id: def8df30-a0b8-4c8c-8796-f1ad0e2feab7`
- Demo data includes marks, attendance, fees, timetable, announcements.

## Working Rules For Future Sessions
- Inspect first.
- SQL first for schema changes.
- Prefer minimal, production-safe patches.
- Do not touch RLS unless explicitly required.
- Do not weaken role checks.
- Preserve routes and working flows.
- Never expose AI to student / parent roles.
- Never show, log, or copy passwords.
- Validate at system boundaries only — trust internal framework guarantees.
