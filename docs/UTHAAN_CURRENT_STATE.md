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
