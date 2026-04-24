# Uthaan

Uthaan is a school management platform for Pakistani private schools.

## Stack
- Next.js App Router
- TypeScript
- Tailwind
- Supabase
- Vercel
- lucide-react

## Roles
- superadmin
- admin
- teacher
- student
- parent

## Routing
- `/` public marketing website
- `/demo` public demo / pilot request form
- `/login` app login
- `/dashboard` logged-in school dashboard
- `/superadmin` operator control center
- `/superadmin/demo-requests` demo request review queue

## Current Product Notes
- Public website uses premium interactive product storytelling:
  - interactive hero insight chips
  - role-based product preview for Admin / Teacher / Parent / Student
  - before/after scattered systems vs one-platform story
- Hero uses a clean floating SaaS/dashboard preview, not a literal laptop/device mockup.
- Public acquisition CTAs go to `/demo`.
- Existing-user login goes to `/login`.
- `school_features` is the source of truth for AI feature gating.
- `schools.plan` is persisted and can be applied by superadmin.
- Demo requests are manual-review only; they do not auto-create schools or users.
- `demo_requests.requested_plan` stores public plan interest:
  - `not_sure`
  - `starter`
  - `growth`
  - `pro`
  - `enterprise`
- Pilot schools get 3 months free, then choose a paid plan.
- Payment automation is not built yet.
- WhatsApp Business API is not built yet.

## Development

Run the dev server:

```bash
npm run dev
```

Type-check:

```bash
npx tsc --noEmit
```

Lint:

```bash
npm run lint
```

## Working Rules
- inspect first
- SQL first for schema changes
- keep patches minimal and production-safe
- do not touch RLS unless explicitly required
- do not weaken role checks
- never expose AI to student/parent roles
