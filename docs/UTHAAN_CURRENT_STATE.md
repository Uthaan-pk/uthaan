# Uthaan Current State

## Product Snapshot
- Uthaan is a school management platform for Pakistani private schools.
- Stack: Next.js App Router, TypeScript, Tailwind, Supabase, Vercel, lucide-react.
- Roles:
  - superadmin
  - admin
  - teacher
  - student
  - parent

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

## Recent Work (Latest)
- Public marketing site now lives at `/` instead of redirecting to `/login` or `/dashboard`
- Public `/demo` flow added for manual demo / pilot capture
- `demo_requests` review flow added at `/superadmin/demo-requests`
- Marketing site copy updated to reflect current onboarding, plans, and live vs planned features
- Public marketing site upgraded with premium interactive storytelling:
  - interactive hero insight chips
  - floating SaaS/dashboard hero preview
  - role-based preview for Admin / Teacher / Parent / Student
  - interactive before/after scattered-systems story
- Superadmin plan automation added:
  - `schools.plan` persisted
  - applying a plan updates `schools.plan`
  - applying a plan upserts `school_features`
  - manual per-feature overrides still remain available
- Superadmin now has visible `Sign out`
- Superadmin now has `View website`
- Shared app sidebar now has `View website`
- Bulk-import happy-path selector stabilized using `student-list-panel`

## Demo / Pilot Flow
- Public users submit requests at `/demo`
- Requests are stored in `demo_requests`
- Superadmin reviews them at `/superadmin/demo-requests`
- Public users can insert requests only
- Public users cannot read, update, or delete requests
- Demo requests can include `requested_plan`:
  - `not_sure`
  - `starter`
  - `growth`
  - `pro`
  - `enterprise`
- This flow does not automatically:
  - create schools
  - create auth users
  - assign billing
  - send email
  - use WhatsApp API

## Demo Request Submission Bug Fix
- `/demo` had a production server error on form submit
- Root cause:
  - `app/demo/actions.ts` was a `'use server'` module exporting a non-action constant alongside the server action
  - the submit path also lacked a protective `try/catch`
- Fix:
  - kept the server action file server-action-only
  - moved `initialState` into the client form component
  - wrapped the insert path in `try/catch`
  - returned a friendly inline error instead of crashing the page

## AI Features Status
- [x] Report card comment generator — live, teacher/admin only
- [x] Attendance alert summaries — live inside app / cron-based
- [x] Smart navigation command palette — live for staff
- [ ] Assignment feedback generator — planned / coming soon
- [ ] Quiz generator from topic — planned / coming soon
- [ ] Fee defaulter risk flag
- [ ] Student performance insight
- [ ] Announcement writer (EN + Urdu)

## Feature Control System
- `school_features` is the source of truth for feature gating
- current columns in use:
  - `school_id`
  - `feature_key`
  - `enabled`
  - `monthly_limit`
  - `used_this_month`
  - `last_reset_at`
- seeded feature keys:
  - `ai_report_comments`
  - `ai_assignment_feedback`
  - `ai_quiz_generator`
  - `ai_attendance_alerts`
- current implementation status:
  - report comments route enforces teacher/admin-only access
  - routes are school-aware and check feature enabled state
  - monthly limits and month-reset logic are live where implemented
  - usage increments only after successful generation
  - superadmin manual toggle persists
  - superadmin monthly limit persists
  - superadmin reset usage works
  - missing `school_features` rows are handled safely
  - `ANTHROPIC_API_KEY` is set in Vercel environment variables

## School Plans
- `schools.plan` allowed values:
  - `pilot`
  - `starter`
  - `growth`
  - `pro`
  - `enterprise`
- Applying a plan updates `schools.plan` and upserts all four AI feature rows
- Applying a plan does not reset:
  - `used_this_month`
  - `last_reset_at`
- Manual per-feature overrides remain possible afterward

## Plan Presets
- `starter`
  - report comments disabled, limit `0`
  - attendance alerts disabled, limit `0`
  - assignment feedback disabled, limit `0`
  - quiz generator disabled, limit `0`
- `growth`
  - report comments enabled, limit `50`
  - attendance alerts enabled, limit `10`
  - assignment feedback disabled, limit `0`
  - quiz generator disabled, limit `0`
- `pro`
  - report comments enabled, limit `200`
  - attendance alerts enabled, limit `50`
  - assignment feedback enabled, limit `100`
  - quiz generator enabled, limit `50`
- `pilot`
  - report comments enabled, limit `100`
  - attendance alerts enabled, limit `20`
  - assignment feedback enabled, limit `20`
  - quiz generator enabled, limit `10`
- `enterprise`
  - report comments enabled, limit `1000`
  - attendance alerts enabled, limit `200`
  - assignment feedback enabled, limit `500`
  - quiz generator enabled, limit `200`

## Command Palette
- Global command palette exists
- entry points:
  - `Cmd+K`
  - sidebar button
  - mobile FAB
- role-aware
- uses Fuse.js search, live student search, and `/api/command-ai`
- AI command navigation uses `claude-haiku-4-5-20251001`
- students/parents blocked from AI command navigation
- teacher/admin rate limit: `20` queries/hour

## Help Video System
- `HelpButton` + `HelpModal` on page headers
- `lib/helpVideos.ts` still contains placeholder YouTube IDs
- real videos still need to replace placeholders

## Attendance Alert Agent
- cron: every Monday 7am PKT (`vercel.json: 0 2 * * 1`)
- flags students with repeated recent attendance issues
- generates attendance alert summaries / announcements for staff-facing workflow
- parents can see resulting in-app alerts where applicable
- no WhatsApp Business API flow is live

## Audit Log
- `lib/audit.ts` exports `writeAuditLog()`
- audit errors are swallowed and should never block the main flow
- audit log is meant for admin / superadmin accountability, not student / parent use

## Superadmin
- Superadmin is the Uthaan operator role, not a school role
- manages:
  - schools
  - school status
  - demo requests
  - school/admin creation
  - browsing / impersonation
  - feature access and monthly limits
  - plan assignment
- `View website` works for logged-in users because `/` is public in middleware
- `Sign out` uses the existing `/auth/signout` route
- `Stop impersonating` remains separate from `Sign out`

## Marketing Site Reality
- Acquisition users should go to `/demo`
- Existing users should go to `/login`
- Hero should stay a clean floating SaaS/dashboard preview, not a literal laptop animation
- Website now includes clickable product-story elements:
  - hero insight chips
  - role-based preview
  - before/after story
- Website should not claim:
  - WhatsApp Business API is live
  - payment automation is live
  - auto-provisioned school creation is live
- Onboarding should be described as:
  1. request demo
  2. Uthaan sets up school
  3. school receives admin / teacher logins
  4. school starts using app

## Business Model
- Pilot schools get `3 months free`, then choose a plan
- Starter: `Rs. 12,000/month`, up to `200` students, core app, no AI
- Growth: `Rs. 30,000/month`, up to `600` students, core + report comments + attendance alerts
- Pro: `Rs. 65,000/month`, up to `1,500` students, more AI + higher limits
- Enterprise: custom, `1,500+` students, custom setup / high limits
- payment automation is not built yet
- payments are expected to be manual first
- WhatsApp Business API is planned later, not live

## Bulk Import / Tests
- bulk import RLS-safe path uses `adminSupabase` + `school_id` on insert
- happy-path selector stabilized by scoping to `student-list-panel`
- superadmin flaky smoke test remains skipped unless explicitly revisited

## Known Data Constraints
- `user_roles.school_id` is `NOT NULL`
- superadmin must still have a valid `school_id` in this database
- student tests may require a linked student record
- parent tests may require a parent_student link
- teacher workflows depend on timetable / class assignment data
- `students.class_num` constrained to `1–8`
- `announcements.priority` valid values: `normal`, `important`, `urgent`

## Current Risk Areas
- auth and RLS mismatches
- school_id scoping bugs
- hidden selector drift in Playwright
- data-dependent smoke tests
- cross-role permission regressions
- AI feature leakage to students/parents
- overclaiming unfinished features on marketing site

## What Good Help Looks Like
- inspect first
- identify exact root cause
- make the smallest safe change
- avoid unrelated rewrites
- preserve production behavior
- SQL first for schema changes
- do not touch RLS unless explicitly required
- do not weaken role checks
- never expose AI to student/parent roles
