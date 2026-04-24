## Product Overview
- Uthaan is a school management platform for Pakistani private schools.
- Stack: Next.js App Router, TypeScript, Tailwind, Supabase, Vercel, lucide-react.
- Roles in product: `superadmin`, `admin`, `teacher`, `student`, `parent`.
- Preserve RLS, school scoping, role restrictions, and production-safe minimal patches.

## Public Website And Routing
- `/` is the public marketing landing page.
- `/demo` is the public demo / pilot request form.
- `/login` is the app login.
- `/dashboard` is the logged-in school dashboard.
- `/superadmin` is the Uthaan operator control center.
- `/superadmin/demo-requests` lets superadmin review demo / pilot requests.

## Marketing Site
- Landing page lives in `components/marketing/LandingPage.tsx` + `LandingPage.module.css`.
- Acquisition CTAs should point to `/demo`.
- Existing users should use `/login`.
- Do not claim WhatsApp Business API is live.
- Do not claim payment automation is live.
- Onboarding copy should reflect the current flow:
  1. Request demo
  2. Uthaan sets up school
  3. School receives admin / teacher logins
  4. School starts using the app

## Demo Request Flow
- Public users can submit demo / pilot requests at `/demo`.
- Requests are stored in `demo_requests`.
- Superadmin reviews requests at `/superadmin/demo-requests`.
- This does not automatically create schools or auth users yet.
- This does not implement payments.
- This does not implement WhatsApp API.

## demo_requests
- Fields:
  - `id`
  - `school_name`
  - `contact_name`
  - `role_title`
  - `email`
  - `phone`
  - `city`
  - `student_count`
  - `message`
  - `status`
  - `reviewed_at`
  - `reviewed_by`
  - `created_at`
- Status values:
  - `new`
  - `contacted`
  - `approved`
  - `rejected`
  - `converted`
- Public users can insert only.
- Superadmin can select / update / delete.
- Public users cannot read requests.

## Superadmin
- Superadmin is the Uthaan operator role, not a school staff role.
- Superadmin manages:
  - schools
  - demo requests
  - school status
  - browsing / impersonation
  - feature access
  - AI limits
  - plan assignment
- Superadmin now has visible `Sign out`.
- Superadmin now has `View website`.
- Shared app sidebar also has `View website`.
- `Stop impersonating` remains separate from `Sign out`.

## School Plans And Feature Automation
- `schools.plan` now exists.
- Allowed values:
  - `pilot`
  - `starter`
  - `growth`
  - `pro`
  - `enterprise`
- `school_features` remains the source of truth for actual AI feature enforcement.
- Superadmin can apply a plan to a school.
- Applying a plan updates `schools.plan` and upserts `school_features` rows.
- Applying a plan does not reset `used_this_month`.
- Applying a plan does not reset `last_reset_at`.
- Manual per-feature overrides remain available.

## Plan Presets
- `starter`
  - `ai_report_comments` disabled, limit `0`
  - `ai_attendance_alerts` disabled, limit `0`
  - `ai_assignment_feedback` disabled, limit `0`
  - `ai_quiz_generator` disabled, limit `0`
- `growth`
  - `ai_report_comments` enabled, limit `50`
  - `ai_attendance_alerts` enabled, limit `10`
  - `ai_assignment_feedback` disabled, limit `0`
  - `ai_quiz_generator` disabled, limit `0`
- `pro`
  - `ai_report_comments` enabled, limit `200`
  - `ai_attendance_alerts` enabled, limit `50`
  - `ai_assignment_feedback` enabled, limit `100`
  - `ai_quiz_generator` enabled, limit `50`
- `pilot`
  - `ai_report_comments` enabled, limit `100`
  - `ai_attendance_alerts` enabled, limit `20`
  - `ai_assignment_feedback` enabled, limit `20`
  - `ai_quiz_generator` enabled, limit `10`
- `enterprise`
  - `ai_report_comments` enabled, limit `1000`
  - `ai_attendance_alerts` enabled, limit `200`
  - `ai_assignment_feedback` enabled, limit `500`
  - `ai_quiz_generator` enabled, limit `200`

## AI Features
- `ANTHROPIC_API_KEY` is set in Vercel environment variables, not in repo.
- Model currently in use for command navigation / report comments / attendance alert workflows: `claude-haiku-4-5-20251001`.
- Report card comment generator is live for teacher / admin only.
- Attendance alert summaries are live inside the app and cron-based.
- Smart navigation command palette is live for staff.
- Assignment feedback generator is planned / coming soon.
- Quiz generator from topic is planned / coming soon.
- Students and parents must never see AI tools.
- AI gating is school-aware through `school_features`.
- Monthly usage limits are enforced where implemented.

## Command Palette
- Global command palette exists.
- Triggers:
  - `Cmd+K`
  - sidebar button
  - mobile FAB
- Role-aware.
- Uses Fuse.js search, live student search, and `/api/command-ai`.
- AI command navigation uses `claude-haiku-4-5-20251001`.
- Students / parents are blocked from AI command navigation.
- Teacher / admin limit: `20` queries per hour.

## Help Video System
- `HelpButton` + `HelpModal` are used on page headers.
- `lib/helpVideos.ts` still contains placeholder YouTube IDs.
- Real recorded help videos are still pending.

## Bulk Import And Tests
- Bulk import RLS-safe path uses `adminSupabase` + `school_id` on insert.
- Bulk-import happy-path selector was stabilized by scoping to `student-list-panel`.
- Superadmin flaky smoke test remains skipped unless explicitly revisited.

## Audit Log
- Table: `audit_logs`
- `lib/audit.ts` exports `writeAuditLog(...)`
- Audit failures should not block main flows.
- Audit log is for admin / superadmin-level accountability, not students / parents.

## Business Model
- Current pricing:
  - Starter: `Rs. 8,000/month`, up to `200` students, core app, no AI
  - Growth: `Rs. 20,000/month`, up to `600` students, core + report comments + attendance alerts
  - Pro: `Rs. 40,000/month`, up to `1,500` students, more AI + higher limits
  - Enterprise: custom, `1,500+` students, custom setup / high limits
- Payment automation is not built yet.
- Payments are expected to be manual first.
- WhatsApp Business API is planned later, not live.

## Onboarding Reality
- Pakistani schools will expect done-for-you onboarding.
- Current best flow:
  - website
  - `/demo` request
  - superadmin review
  - contact school
  - create school + admin login
  - assign plan / features
  - school logs in at `/login`
- Future roadmap:
  - approve demo request → create school + admin account + default pilot plan
  - bulk teacher / student / parent account generator
  - download credentials CSV
  - phone / OTP login or WhatsApp-based parent access later

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
