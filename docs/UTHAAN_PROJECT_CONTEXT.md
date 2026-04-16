# Uthaan Project Context

## Product
Uthaan is a multi-role school management platform built for real school workflows, especially Pakistani school operations.

## Stack
- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Vercel

## Roles
- superadmin
- admin
- teacher
- student
- parent

## Main Modules
- Dashboard
- Students
- Announcements (+ acknowledgement receipts)
- Assignments
- Gradebook / Marks
- Results / Report Cards
- Attendance
- Quizzes
- Timetable
- Materials
- Fees
- Student management (UI label; was "Admin panel")
- Onboarding (UI label; was "School Signups")
- Leave management
- Audit Log (page exists but has no sidebar entry — unreachable from nav)

## Role Behavior
- Teachers handle most academic workflows like attendance, marks, quizzes, and assignments
- Admin has oversight and management access, but some teacher-only academic actions are intentionally restricted
- Students mainly view and complete work
- Parents mainly view linked child information
- Superadmin has cross-school / impersonation-style access

## Important Technical Constraints
- Supabase RLS is heavily used
- Preserve existing routes, schema, and working flows
- Do not invent new routes, tables, columns, or schema
- Keep fixes minimal and production-safe
- Do not redesign unrelated pages
- If SQL is needed, provide SQL first
- Do not weaken security or remove RLS to make something work
- Prefer small targeted patches over broad refactors

## Important Data / App Behavior
- Attendance statuses include: present, absent, late, excused, early_leave
- Leave system supports approved full-day leave and approved early leave
- Results/report cards exist in-app and support PDF download
- Bulk AI report comment generation is class-level, not global, and counts as 1 usage event per successful class generation
- user_roles.school_id is required (NOT NULL)
- superadmin rows in user_roles must also include a valid school_id in this database
- Parent behavior depends on parent_student links
- Student behavior may depend on linked student_id in user_roles
- Teacher attendance and class views may depend on timetable relationships

## Communication Philosophy
- Uthaan is NOT a chat or messaging app
- Communication is structured, workflow-attached, and async only
- No open DMs, no real-time chat, no student-to-student or parent-to-parent messaging
- The announcement module is the primary broadcast channel (admin/teacher → students/parents)
- Acknowledgements are receipts, not social reactions

## UI Conventions
- Icons: lucide-react is used for all sidebar nav icons
- Sidebar nav items always render icon + label in a flex row with gap-2.5
- Active nav item: icon at full opacity, inactive at opacity-60
- Stat cards use conditional color tinting to signal status:
  - Attendance < 75%: bg-amber-50 border-amber-200
  - Fees outstanding/overdue: bg-red-50 border-red-200
  - Active quizzes: bg-green-50 border-green-200
- Teacher dashboard is a morning briefing layout: today's classes, attendance pending, pending grading, needs grading list, then announcements
- Do not add dark backgrounds to sidebar without strong reason — the current green sidebar has good character, preserve it

## Announcement Acknowledgements
- Table: announcement_acknowledgements (id, announcement_id, user_id, school_id, acknowledged_at)
- Students and parents can mark an announcement as acknowledged (one row per user per announcement)
- Admins and teachers can see acknowledgement counts and the list of who confirmed
- Components: AcknowledgeButton (student/parent view), AcknowledgementStatus (admin/teacher view)
- API routes: POST /api/announcements/[id]/acknowledge, GET /api/announcements/[id]/acknowledgements
- No reactions, no threading, no social features on announcements

## AI Features
- Report card comment generator: built. Uses claude-haiku-4-5-20251001, reads marks + attendance logs,
  supports class-level bulk generation, and is teacher/admin only.
  Route: /api/ai/report-comments/route.ts. Component: ReportCommentGenerator.
- Attendance alert summary: built. Weekly cron (Mon 7am PKT), flags students with 3+ absences/late
  in 7 days, generates parent alerts via Anthropic Batch API, saves to announcements table.
  Routes: /api/ai/attendance-alerts/route.ts, /api/cron/attendance-alerts/route.ts.
  Component: AttendanceAlertSummary. Cron: vercel.json schedule 0 2 * * 1.
- AI feature gating is implemented via school_features and is active per school.
  Teacher/admin can use enabled AI features; student/parent must never see AI controls.
- Remaining AI features planned (in order):
  2. Assignment feedback generator
  3. Quiz generator from topic
  4. Fee defaulter risk flag (nightly cron)
  5. Student performance insight (uses claude-sonnet-4-6)
  6. Announcement writer (bilingual EN + Urdu)

## Feature Control System
- Table: school_features
- Columns in active use:
  - school_id
  - feature_key
  - enabled
  - monthly_limit
  - used_this_month
  - last_reset_at
- Seeded feature keys:
  - ai_report_comments
  - ai_assignment_feedback
  - ai_quiz_generator
  - ai_attendance_alerts
- Current implementation status:
  - Report comments route enforces teacher/admin-only access, school-aware feature lookup,
    enabled checks, monthly limit checks, monthly reset, and post-success usage increment.
  - Superadmin can manage feature toggles and limits for all schools, and reset usage safely.
  - Missing school_features rows are handled safely in the current control flow.

## Results / Report Cards AI UX
- Bulk comment generation is class-level, not global.
- Staff UI explains unavailable states explicitly:
  - feature disabled
  - quota reached
  - class selection required
- The review panel opens only after successful generation.

## Testing Philosophy
- Prefer focused Playwright smoke tests, not broad fragile full-app tests
- High-value smoke coverage:
  - teacher attendance save
  - student quiz submission and results persistence
  - admin blocked from teacher-only academic actions
  - parent linked child visibility
  - superadmin impersonation exit
- Avoid excessive login-only tests
- Prefer stable selectors and deterministic seeded test accounts

## Current Goal
Make Uthaan more polished, reliable, and differentiated than generic school apps while preserving the working core product and role rules.

## Instructions for AI coding help
- Inspect before editing
- Explain root cause briefly before fixing
- List exact files to change
- Give SQL first if database changes are required
- Then provide the smallest safe patch
- Do not output huge unrelated code blocks
- Do not refactor broadly unless explicitly asked
