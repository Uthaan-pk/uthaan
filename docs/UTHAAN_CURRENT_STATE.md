# Uthaan Current State

## Current Priorities
- improve product polish and reliability
- make the app feel differentiated from generic classroom tools
- maintain role restrictions and RLS integrity
- expand Playwright smoke coverage (RLS regression tests next)
- keep AI feature gating and usage enforcement production-safe
- assignment feedback generator is the next AI feature

## Recent Work (April 21 2026)
- API key added to Vercel — AI features now live in production
- Generate Comments button fixed (was silently disabled when no class selected)
- Teacher timetable filtered to own periods only
- Dashboard "my classes today" fixed with Asia/Karachi timezone
- {CURRENT_TERM} literal string bug fixed on timetable page
- Attendance page centered to match rest of app layout
- Attendance page filtered to teacher's own classes only
- Timetable tabs filtered — teachers only see classes they teach
- Materials page filtered — teachers see only their subject/class materials
- Low attendance card on admin dashboard now links to /attendance/low drilldown
- Bulk import RLS bug fixed (adminSupabase + school_id on insert)
- All 7 bulk import Playwright tests passing
- Audit log instrumented for 5 high-risk actions (marks, archive, fees, attendance, role changes)
- 10 UI polish fixes: WhatsApp constant, audit log nav, marks see-all, login page, forgot password, fees header, N+1 acks, skeleton states, timetable mobile, pagination
- Seed data added: timetable periods, announcements, assignments, marks, fees, attendance history for demo school

## AI Features Status
- [x] Report card comment generator — built, class-level bulk workflow, teacher/admin only
- [x] Attendance alert summary — built, cron-based (Mon 7am PKT), runs weekly
- [ ] Assignment feedback generator — next up
- [ ] Quiz generator from topic
- [ ] Fee defaulter risk flag (nightly cron)
- [ ] Student performance insight (claude-sonnet-4-6)
- [ ] Announcement writer (bilingual EN + Urdu)

## Feature Control System
- school_features is active and seeded per school
- current columns in use:
  - school_id
  - feature_key
  - enabled
  - monthly_limit
  - used_this_month
  - last_reset_at
- seeded feature keys:
  - ai_report_comments
  - ai_assignment_feedback
  - ai_quiz_generator
  - ai_attendance_alerts
- current implementation status:
  - report comments route enforces teacher/admin-only access
  - route behavior is school-aware and checks feature enabled state
  - monthly limits and month-reset logic are live
  - usage increments only after successful generation
  - bulk class generation counts as 1 usage event
  - superadmin toggle persists
  - superadmin monthly limit persists
  - superadmin reset usage works
  - missing school_features rows are handled safely
  - ANTHROPIC_API_KEY is set in Vercel environment variables

## Attendance Alert Agent
- Cron: every Monday 7am PKT (vercel.json: 0 2 * * 1)
- Flags students with 3+ absences/late in last 7 days
- Generates parent alert messages via Anthropic Batch API
- Saves alerts as announcements in the app
- Parents see alerts on their announcements page
- To disable: Vercel → Settings → Cron Jobs → toggle off
- Cost: ~$0.02-0.05 per run, negligible

## Audit Log
- lib/audit.ts — writeAuditLog() helper, swallows errors so it never blocks callers
- Instrumented actions:
  - marks CSV import (actions.ts)
  - manual marks save (MarksEditor.tsx)
  - student archive (delete-student/route.ts)
  - fee mark paid/unpaid/assign (FeesClient.tsx)
  - attendance save (AttendanceMarker.tsx)
  - role assignment (assign-role/route.ts)
- Audit Log page accessible via admin sidebar

## Playwright Test Coverage
- bulk-import.spec.ts — all 7 tests passing
- smoke.spec.ts — core role-based workflows
- Global setup with saved auth states
- Superadmin auth skipped (redirects to /superadmin not /dashboard)

## Known Data Constraints
- user_roles.school_id is NOT NULL
- superadmin must still have a valid school_id in this database
- student tests may require a valid linked student record
- parent tests may require a parent_student link
- teacher workflows depend on timetable/class assignment data
- students.class_num is constrained to 1–8
- announcements.priority valid values: normal, important, urgent

## UI Conventions
- Icons: lucide-react across all sidebar nav items
- Stat cards use conditional color tinting for attendance/fee/quiz status
- Teacher dashboard is morning briefing layout
- Admin dashboard is control centre layout with needs-attention cards
- All pages use uthaan-page-shell / uthaan-page-main / uthaan-page-header / uthaan-page-content
- Skeleton loading states via components/Skeleton.tsx
- Pagination: PAGE_SIZE=50 on students and fees lists

## Current Risk Areas
- auth and RLS mismatches
- school-scoped visibility bugs
- hidden selector drift in Playwright
- data-dependent smoke tests
- cross-role permission regressions

## What good help looks like
- inspect first
- identify exact root cause
- make the smallest safe change
- avoid unrelated rewrites
- preserve production behavior