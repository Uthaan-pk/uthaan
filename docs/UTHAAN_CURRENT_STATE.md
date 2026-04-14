# Uthaan Current State

## Current Priorities
- stabilize Playwright CI
- reduce manual testing burden
- preserve role restrictions
- improve product polish and reliability
- make the app feel more differentiated than generic classroom tools

## Recent Work
- admin has been restricted from some teacher-only academic actions
- superadmin impersonation exit flow has been added/fixed
- quiz submission flow had RLS-related issues and was being stabilized
- report cards/results exist and can be downloaded as PDFs
- announcement acknowledgements added (student/parent mark as read, admin sees receipt counts)
- AI feature 1 (attendance alert summary) built: cron + admin-trigger + component
- UI audit completed — 24 issues identified across 4 severity levels
- Critical UI fixes applied: duplicate Grade Settings link, window.confirm() archive, unreachable Homework/Notes pages, "Posted by teacher" label, excused/early_leave missing styles

## AI Features Status
- [x] Report card comment generator — done
- [x] Attendance alert summary — done (cron Mon 7am PKT, Batch API, saves to announcements)
- [ ] Assignment feedback generator — next
- [ ] Quiz generator from topic
- [ ] Fee defaulter risk flag (nightly cron)
- [ ] Student performance insight (claude-sonnet-4-6)
- [ ] Announcement writer (bilingual EN + Urdu)

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