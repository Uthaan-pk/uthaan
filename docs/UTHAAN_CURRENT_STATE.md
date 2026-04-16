# Uthaan Current State

## Current Priorities
- improve product polish and reliability
- make the app feel differentiated from generic classroom tools
- maintain role restrictions and RLS integrity
- expand Playwright smoke coverage (RLS regression tests next)
- keep AI feature gating and usage enforcement production-safe
- assignment feedback generator is the next AI feature

## Recent Work
- admin restricted from teacher-only academic actions
- superadmin impersonation exit flow fixed
- quiz submission flow stabilized (RLS issues resolved)
- report cards exist and download as PDF
- report card comment generator built with class-level bulk generation
- attendance alert summary built with cron-based generation
- school_features system added and activated for per-school AI gating and limits
- results bulk AI UX tightened: disabled/quota/class-selection states explained, review opens only after success
- announcement acknowledgements added
- UI audit completed — 24 issues identified
- Critical UI fixes applied: duplicate Grade Settings link, window.confirm() archive, unreachable Homework/Notes pages, "Posted by teacher" label, excused/early_leave missing styles
- Sidebar icons added via lucide-react across all nav items
- Stat cards now use color tinting to signal attendance/fee/quiz status
- Teacher dashboard redesigned as morning briefing layout
- Admin sidebar cleaned up: Audit Log removed from nav, "Admin Panel" renamed to "Student management", "School Signups" renamed to "Onboarding"
- Urdu translations patched: 'marked' fixed to 'نشان زد', 'homeworkDue' fixed to 'ہوم ورک باقی'
- Playwright smoke suite hardened: admin attendance test de-brittled, quiz href parsing fixed, role permission test added (teacher vs admin), student nav visibility test added

## AI Features Status
- [x] Report card comment generator — built, class-level bulk workflow, teacher/admin only
- [x] Attendance alert summary — built, cron-based
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
  - usage increments only after successful generation and bulk class generation counts as 1 usage event
  - superadmin toggle persists
  - superadmin monthly limit persists
  - superadmin reset usage works
  - missing school_features rows are handled safely

## UI Audit Findings (from full codebase audit)
Critical issues fixed. Remaining items below for future sprints.

### High (next to fix)
- Sidebar has icons on only 2 of ~15 nav items — Fees and Grade Settings have SVGs; all others are bare text
- Two header padding variants across pages — pr-6 pl-16 md:px-6 vs px-6 pl-16 md:pl-6
- FeesClient owns its own header HTML — only client component that renders its own <header>
- Marks breadcrumb is the only back-navigation pattern in the app

### Medium
- my-child marks capped at 5 with no "see more" — marks.slice(0, 5), no link to full gradebook
- Timetable unusable on mobile — no mobile layout for the 8×5 grid
- No pagination anywhere — all lists capped at .limit(500) with no page controls
- text-[10px] and text-[11px] used 50+ times — below WCAG minimum, mix of 3 small sizes
- AcknowledgementStatus fires one API call per announcement on mount — N concurrent fetches
- No skeleton/loading states anywhere — pages go blank on slow connections
- admin/page.tsx runs the same students query twice in Promise.all
- ComposeAnnouncement has no focus management — keyboard doesn't open on mobile
- AdminClient tab bar has no count badges on Students / Bulk Import / Parent Links
- "Results & Report Cards" sidebar label truncates for teachers at normal zoom

### Low
- getInitials() duplicated in 4+ files — MarksEditor, GradebookGrid, StudentsTable, AttendanceMarker
- Dark mode CSS variables defined in globals.css but never applied
- WhatsApp support link has hardcoded phone number in Sidebar.tsx:486
- FeesClient filter dropdowns use text-gray-700 vs text-gray-900 elsewhere

## Current Playwright Direction
- move away from repeated UI login tests
- use global setup with saved auth states
- use a smoke suite for critical role-based workflows
- GitHub Actions requires test secrets for role accounts

## Known Data Constraints
- user_roles.school_id is NOT NULL
- superadmin must still have a valid school_id in this database
- student tests may require a valid linked student record
- parent tests may require a parent_student link
- teacher workflows may depend on timetable/class assignment data
- some smoke tests may skip if no real school/quiz data exists
- Sidebar label renames are display-only — routes unchanged
- Audit Log page exists at its route but has no sidebar entry

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
