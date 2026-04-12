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
- Announcements
- Assignments
- Gradebook / Marks
- Results / Report Cards
- Attendance
- Quizzes
- Timetable
- Materials
- Fees
- Admin panel
- Leave management

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
- user_roles.school_id is required (NOT NULL)
- superadmin rows in user_roles must also include a valid school_id in this database
- Parent behavior depends on parent_student links
- Student behavior may depend on linked student_id in user_roles
- Teacher attendance and class views may depend on timetable relationships

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
